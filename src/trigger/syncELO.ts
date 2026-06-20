// =============================================================================
// syncELO.ts — Trigger.dev scheduled task for ELO rankings
// =============================================================================

import { schedules, logger, retry } from "@trigger.dev/sdk/v3";
import { fetchAllSeasonMatches } from "../lib/stats/fetchMatches";
import { calculateRankings } from "../lib/elo/calcELO";
import { supabase } from "../lib/contentScripts/supabase";
import type { RatedTeam } from "../lib/elo/calcELO";

export const syncELOTask = schedules.task({
  id: "sync-elo-rankings",
  cron: "0 * * * *",

  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 30_000 },

  run: async () => {
    const apiKey = process.env.LIQUIPEDIA_API_KEY;
    if (!apiKey) throw new Error("LIQUIPEDIA_API_KEY is not set");

    // ── 1. Load existing state ───────────────────────────────────────────────
    logger.info("Loading existing state from Supabase...");

    const [{ data: existingRankings }, { data: globalStatsRow }] = await Promise.all([
      supabase.from("rankings").select("*"),
      supabase.from("global_stats").select("last_synced_at").eq("id", 1).single(),
    ]);

    const lastSyncedAt: string | null = globalStatsRow?.last_synced_at ?? null;
    const isIncremental = !!(lastSyncedAt && existingRankings?.length);

    logger.info(isIncremental
      ? `Incremental sync — fetching matches since ${lastSyncedAt}`
      : "Full recalc — no checkpoint found, processing entire season",
    );

    // ── 2. Fetch from Liquipedia ─────────────────────────────────────────────
    const matches = await retry.onThrow(
      async () => {
        const result = await fetchAllSeasonMatches(apiKey, "Nexus-Bot", isIncremental ? lastSyncedAt! : undefined);
        if (!Array.isArray(result)) throw new Error("Invalid response from Liquipedia");
        return result;
      },
      { maxAttempts: 3, factor: 2, minTimeoutInMs: 10_000 },
    );

    logger.info(`Fetched ${matches.length} matches from Liquipedia`);

    if (matches.length === 0 && isIncremental) {
      logger.info("No new matches since last sync — nothing to do");
      return { status: "skipped", reason: "no_new_matches", teams: existingRankings?.length ?? 0 };
    }

    // ── 3. Rebuild team state from DB ────────────────────────────────────────
    let initialTeams: Record<string, RatedTeam> | undefined;

    if (isIncremental && existingRankings) {
      initialTeams = {};
      for (const row of existingRankings) {
        initialTeams[row.name] = {
          name:                  row.name,
          rating:                row.rating,
          wins:                  row.wins,
          losses:                row.losses,
          region:                row.region,
          logo:                  row.logo ?? undefined,
          logoDark:              row.logo_dark ?? undefined,
          history:               row.history ?? [],
          tournaments:           row.tournaments ?? [],
          form:                  row.form ?? [],
          isPartner:             row.is_partner ?? false,
          gamesInCurrentRoster:  row.games_in_current_roster ?? 0,
          lastResetDate:         row.last_reset_date ?? undefined,
          rosterFingerprint:     row.roster_fingerprint ?? [],
          lastMatchDate:         row.last_match_date ?? undefined,
          inactivityDecay:       row.inactivity_decay ?? 1.0,
        };
      }
      logger.info(`Rebuilt ${Object.keys(initialTeams).length} teams from DB`);
    }

    // ── 4. Run ELO calculator ────────────────────────────────────────────────
    logger.info("Running ELO calculation...");
    const { rankings, processedMatches, stats } = calculateRankings(matches, { initialTeams });
    logger.info(`ELO complete — ${rankings.length} teams ranked`);

    // ── 5. Build DB payloads ─────────────────────────────────────────────────
    const cleanRankings = rankings.map(r => ({
      name:                   r.name,
      rating:                 r.rating,
      wins:                   r.wins,
      losses:                 r.losses,
      region:                 r.region,
      logo:                   r.logo,
      logo_dark:              r.logoDark,
      is_partner:             r.isPartner,
      form:                   r.form,
      history:                r.history,
      tournaments:            r.tournaments,
      rank_delta:             r.rankDelta ?? null,
      games_in_current_roster: r.gamesInCurrentRoster,
      last_reset_date:        r.lastResetDate ?? null,
      roster_fingerprint:     r.rosterFingerprint,
      last_match_date:        r.lastMatchDate ?? null,
      inactivity_decay:       r.inactivityDecay,
      updated_at:             new Date().toISOString(),
      // NOTE: deliberately NOT writing `roster` here. It isn't part of
      // RatedTeam / calculateRankings — it's owned exclusively by
      // syncPlayers.ts. Including it (even as `[] `) would clobber the
      // real roster every hour on this job's upsert, racing against
      // syncPlayers' 6-hourly run and leaving rosters empty half the time.
    }));

    const cleanMatches = processedMatches.map(m => ({
      id:               m.id,
      date:             m.date,
      tournament:       m.tournament,
      team_a:           m.team_a,
      team_b:           m.team_b,
      score_a:          m.score_a,
      score_b:          m.score_b,
      winner_id:        m.winner_id,
      is_major:         m.is_major,
      is_regional:      m.is_regional,
      elo_change_a:     m.elo_change_a,
      elo_change_b:     m.elo_change_b,
      team_a_elo_after: m.team_a_elo_after,
      team_b_elo_after: m.team_b_elo_after,
      details:          m.details ?? null,
    }));

    const latestMatchDate = matches.length > 0
      ? matches.reduce((l, m) => m.date > l ? m.date : l, matches[0].date)
      : lastSyncedAt;

    const cleanStats = {
      id: 1,
      biggest_mover:  stats.biggestMover,
      biggest_loser:  stats.biggestLoser,
      biggest_upsets: stats.biggestUpsets,
      longest_reign:  stats.longestReign,
      last_synced_at: latestMatchDate,
      updated_at:     new Date().toISOString(),
    };

    // ── 6. Persist to Supabase (matches in batches) ──────────────────────────
    logger.info("Writing to Supabase...");

    const BATCH = 50;
    for (let i = 0; i < cleanMatches.length; i += BATCH) {
      const { error } = await supabase
        .from("processed_matches")
        .upsert(cleanMatches.slice(i, i + BATCH), { onConflict: "id" });
      if (error) throw new Error(`matches batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    }

    const [rankingsResult, statsResult] = await Promise.all([
      supabase.from("rankings").upsert(cleanRankings, { onConflict: "name" }),
      supabase.from("global_stats").upsert(cleanStats, { onConflict: "id" }),
    ]);

    if (rankingsResult.error) throw new Error(`rankings: ${rankingsResult.error.message}`);
    if (statsResult.error)   throw new Error(`global_stats: ${statsResult.error.message}`);

    logger.info("Supabase write complete ✓");

    return {
      status: "success",
      incremental: isIncremental,
      newMatches: matches.length,
      teams: rankings.length,
      lastSyncedAt: latestMatchDate,
    };
  },
});
