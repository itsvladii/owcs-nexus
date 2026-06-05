// =============================================================================
// syncGPR.ts — Trigger.dev scheduled task for the GPR ranking system
//
// Replaces syncELO.ts. Key differences:
//   - Persists `accumulators` to Supabase so incremental syncs don't lose
//     season-long P1/P2/P3 history (ELO didn't need this — GPR does).
//   - Passes `initialAccumulators` to calculateGPR for true incremental syncs.
//   - Same incremental vs full-recalc logic as before.
// =============================================================================

import { logger, retry, schedules } from "@trigger.dev/sdk/v3";
import { fetchAllSeasonMatches } from "../lib/stats/fetchMatches";
import { calculateGPR } from "../lib/elo/calcGPR";
import { supabase } from "../lib/contentScripts/supabase";
import type { GPRTeam } from "../lib/elo/calcGPR";

export const syncGPRTask = schedules.task({
  id: "sync-gpr-rankings",
  cron: "0 * * * *",

  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 30_000,
  },

  run: async () => {
    const apiKey = process.env.LIQUIPEDIA_API_KEY;
    if (!apiKey) throw new Error("LIQUIPEDIA_API_KEY is not set");

    // ── 1. Load existing state ───────────────────────────────────────────────
    logger.info("Loading existing state from Supabase...");

    const [
      { data: existingRankings },
      { data: globalStatsRow },
      { data: existingAccumulators },
    ] = await Promise.all([
      supabase.from("rankings").select("*"),
      supabase.from("global_stats").select("last_synced_at").eq("id", 1)
        .single(),
      // Accumulators table stores P1/P2/P3 raw signal history per team
      supabase.from("gpr_accumulators").select("*"),
    ]);

    const lastSyncedAt: string | null = globalStatsRow?.last_synced_at ?? null;

    // ── 2. Incremental vs full recalc ────────────────────────────────────────
    const isIncremental = !!(lastSyncedAt && existingRankings?.length &&
      existingAccumulators?.length);

    logger.info(
      isIncremental
        ? `Incremental sync — fetching matches since ${lastSyncedAt}`
        : "Full recalc — no checkpoint found, processing entire season",
    );

    // ── 3. Fetch from Liquipedia ─────────────────────────────────────────────
    const matches = await retry.onThrow(
      async () => {
        const result = await fetchAllSeasonMatches(
          apiKey,
          "Nexus-Bot",
          isIncremental ? lastSyncedAt! : undefined,
        );
        if (!Array.isArray(result)) {
          throw new Error("Invalid response from Liquipedia");
        }
        return result;
      },
      { maxAttempts: 3, factor: 2, minTimeoutInMs: 10_000 },
    );

    logger.info(`Fetched ${matches.length} matches from Liquipedia`);

    // ── 4. Early exit ────────────────────────────────────────────────────────
    if (matches.length === 0 && isIncremental) {
      logger.info("No new matches since last sync — nothing to do");
      return {
        status: "skipped",
        reason: "no_new_matches",
        teams: existingRankings?.length ?? 0,
      };
    }

    // ── 5. Rebuild GPRTeam map + accumulators from DB ────────────────────────
    let initialTeams: Record<string, GPRTeam> | undefined;
    let initialAccumulators: Record<string, any> | undefined;

    if (isIncremental && existingRankings && existingAccumulators) {
      initialTeams = {};
      for (const row of existingRankings) {
        initialTeams[row.name] = {
          name: row.name,
          gpr: row.gpr,
          gprRaw: row.gpr_raw ??
            { consistency: row.gpr, international: row.gpr, momentum: row.gpr },
          region: row.region,
          regionalSeed: row.regional_seed,
          wins: row.wins,
          losses: row.losses,
          logo: row.logo ?? undefined,
          logoDark: row.logo_dark ?? undefined,
          history: row.history ?? [],
          form: row.form ?? [],
          tournaments: row.tournaments ?? [],
          isPartner: row.is_partner ?? false,
          rankDelta: row.rank_delta ?? undefined,
          rosterFingerprint: row.roster_fingerprint ?? [],
          rosterConfidence: row.roster_confidence ?? 0,
          lastRosterRegressionDate: row.last_roster_regression_date ??
            undefined,
          lastMatchDate: row.last_match_date ?? undefined,
          inactivityDecay: row.inactivity_decay ?? 1.0,
        };
      }

      initialAccumulators = {};
      for (const row of existingAccumulators) {
        initialAccumulators[row.team_name] = {
          p1Entries: row.p1_entries ?? [],
          p2Entries: row.p2_entries ?? [],
          p3Entries: row.p3_entries ?? [],
        };
      }

      logger.info(
        `Rebuilt ${Object.keys(initialTeams).length} teams and ${
          Object.keys(initialAccumulators).length
        } accumulators from DB`,
      );
    }

    // ── 6. Run GPR calculator ────────────────────────────────────────────────
    logger.info("Running GPR calculation...");
    const { rankings, processedMatches, accumulators, stats } = calculateGPR(
      matches,
      {
        initialTeams,
        initialAccumulators,
      },
    );
    logger.info(`GPR complete — ${rankings.length} teams ranked`);

    // ── 7. Build DB payloads ─────────────────────────────────────────────────
    const cleanRankings = rankings.map((r) => ({
      name: r.name,
      gpr: r.gpr,
      gpr_raw: r.gprRaw,
      regional_seed: r.regionalSeed,
      wins: r.wins,
      losses: r.losses,
      region: r.region,
      logo: r.logo,
      logo_dark: r.logoDark,
      is_partner: r.isPartner,
      form: r.form,
      history: r.history,
      tournaments: r.tournaments,
      rank_delta: r.rankDelta ?? null,
      roster_fingerprint: r.rosterFingerprint,
      roster_confidence: r.rosterConfidence,
      last_roster_regression_date: r.lastRosterRegressionDate ?? null,
      last_match_date: r.lastMatchDate ?? null,
      inactivity_decay: r.inactivityDecay,
      updated_at: new Date().toISOString(),
    }));

    // Persist accumulators so future incremental syncs have full season history
    const cleanAccumulators = Object.entries(accumulators).map((
      [teamName, acc],
    ) => ({
      team_name: teamName,
      p1_entries: acc.p1Entries,
      p2_entries: acc.p2Entries,
      p3_entries: acc.p3Entries,
      updated_at: new Date().toISOString(),
    }));

    const latestMatchDate = matches.length > 0
      ? matches.reduce(
        (latest, m) => (m.date > latest ? m.date : latest),
        matches[0].date,
      )
      : lastSyncedAt;

    const cleanStats = {
      id: 1,
      biggest_mover: stats.biggestMover,
      biggest_loser: stats.biggestLoser,
      biggest_upsets: stats.biggestUpsets,
      longest_reign: stats.longestReign,
      last_synced_at: latestMatchDate,
      updated_at: new Date().toISOString(),
    };

    // ── 8. Map processedMatches to DB column shape ───────────────────────────
    const cleanMatches = processedMatches.map((m) => ({
      id: m.id,
      date: m.date,
      tournament: m.tournament,
      team_a: m.team_a,
      team_b: m.team_b,
      score_a: m.score_a,
      score_b: m.score_b,
      winner_id: m.winner_id,
      is_major: m.isMajor,
      is_regional: m.isRegional,
      gpr_change_a: m.gpr_change_a,
      gpr_change_b: m.gpr_change_b,
      team_a_gpr_after: m.team_a_gpr_after,
      team_b_gpr_after: m.team_b_gpr_after,
      details: m.details ?? null,
    }));

    // ── 9. Persist to Supabase ───────────────────────────────────────────────
    logger.info("Writing to Supabase...");

    // Batch processed_matches in chunks of 50 to avoid Supabase request size limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < cleanMatches.length; i += BATCH_SIZE) {
      const batch = cleanMatches.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("processed_matches")
        .upsert(batch, { onConflict: "id" });
      if (error) {
        throw new Error(
          `matches upsert (batch ${i / BATCH_SIZE + 1}): ${error.message}`,
        );
      }
    }
    logger.info(
      `Upserted ${cleanMatches.length} matches in ${
        Math.ceil(cleanMatches.length / BATCH_SIZE)
      } batches`,
    );

    const [rankingsResult, accResult, statsResult] = await Promise.all([
      supabase.from("rankings").upsert(cleanRankings, { onConflict: "name" }),
      supabase.from("gpr_accumulators").upsert(cleanAccumulators, {
        onConflict: "team_name",
      }),
      supabase.from("global_stats").upsert(cleanStats, { onConflict: "id" }),
    ]);

    if (rankingsResult.error) {
      throw new Error(`rankings upsert: ${rankingsResult.error.message}`);
    }
    if (accResult.error) {
      throw new Error(`accumulators upsert: ${accResult.error.message}`);
    }
    if (statsResult.error) {
      throw new Error(`global_stats upsert: ${statsResult.error.message}`);
    }

    logger.info("Supabase write complete ✓");

    return {
      status: "success",
      incremental: isIncremental,
      newMatches: matches.length,
      teams: rankings.length,
      lastSyncedAt: latestMatchDate,
      biggestMover: stats.biggestMover,
      biggestLoser: stats.biggestLoser,
    };
  },
});
