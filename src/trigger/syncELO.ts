import { schedules, logger, retry } from "@trigger.dev/sdk/v3";
import { fetchAllSeasonMatches } from "../lib/stats/fetchMatches";
import { calculateRankings } from "../lib/elo/calcELO";
import { supabase } from "../lib/contentScripts/supabase";
import type { RatedTeam } from "../lib/elo/calcELO";

// ── Runs every 3 hours, same cadence as the old GitHub Action ──
export const syncELOTask = schedules.task({
  id: "sync-elo-rankings",
  cron: "0 */3 * * *",

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

    const [{ data: existingRankings }, { data: globalStatsRow }] =
      await Promise.all([
        supabase.from("rankings").select("*"),
        supabase
          .from("global_stats")
          .select("last_synced_at")
          .eq("id", 1)
          .single(),
      ]);

    const lastSyncedAt: string | null = globalStatsRow?.last_synced_at ?? null;

    // ── 2. Incremental vs full recalc ────────────────────────────────────────
    const isIncremental = !!(
      lastSyncedAt &&
      existingRankings &&
      existingRankings.length > 0
    );

    logger.info(
      isIncremental
        ? `Incremental sync — fetching matches since ${lastSyncedAt}`
        : "Full recalc — no checkpoint found, processing entire season",
    );

    // ── 3. Fetch from Liquipedia (with per-step retry) ───────────────────────
    const matches = await retry.onThrow(
      async () => {
        const result = await fetchAllSeasonMatches(
          apiKey,
          "Nexus-Bot",
          isIncremental ? lastSyncedAt! : undefined,
        );
        if (!Array.isArray(result))
          throw new Error("Invalid response from Liquipedia");
        return result;
      },
      { maxAttempts: 3, factor: 2, minTimeoutInMs: 10_000 },
    );

    logger.info(`Fetched ${matches.length} matches from Liquipedia`);

    // ── 4. Early exit if nothing new ─────────────────────────────────────────
    if (matches.length === 0 && isIncremental) {
      logger.info("No new matches since last sync — nothing to do");
      return {
        status: "skipped",
        reason: "no_new_matches",
        teams: existingRankings?.length ?? 0,
      };
    }

    // ── 5. Rebuild RatedTeam map from DB snapshot ────────────────────────────
    let initialTeams: Record<string, RatedTeam> | undefined;

    if (isIncremental && existingRankings) {
      initialTeams = {};
      for (const row of existingRankings) {
        initialTeams[row.name] = {
          name: row.name,
          rating: row.rating,
          wins: row.wins,
          losses: row.losses,
          region: row.region,
          logo: row.logo ?? undefined,
          logoDark: row.logo_dark ?? undefined,
          history: row.history ?? [],
          tournaments: row.tournaments ?? [],
          form: row.form ?? [],
          isPartner: row.is_partner ?? false,
          gamesInCurrentRoster:
            row.games_in_current_roster ?? row.wins + row.losses,
          lastResetDate: row.last_reset_date ?? undefined,
        };
      }
      logger.info(`Rebuilt ${Object.keys(initialTeams).length} teams from DB`);
    }

    // ── 6. Run ELO calculator ────────────────────────────────────────────────
    logger.info("Running ELO calculation...");
    const { rankings, processedMatches, stats } = calculateRankings(matches, {
      isStartSeason: false,
      initialTeams,
    });
    logger.info(`ELO complete — ${rankings.length} teams ranked`);

    // ── 7. Build clean DB payloads ───────────────────────────────────────────
    const cleanRankings = rankings.map((r) => ({
      name: r.name,
      rating: r.rating,
      wins: r.wins,
      losses: r.losses,
      region: r.region,
      logo: r.logo,
      logo_dark: r.logoDark,
      is_partner: r.isPartner,
      form: r.form,
      history: r.history,
      tournaments: r.tournaments,
      rank_delta: r.rankDelta,
      games_in_current_roster: r.gamesInCurrentRoster,
      last_reset_date: r.lastResetDate ?? null,
      updated_at: new Date().toISOString(),
    }));

    const latestMatchDate =
      matches.length > 0
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

    // ── 8. Persist to Supabase ───────────────────────────────────────────────
    logger.info("Writing to Supabase...");

    const [matchesResult, rankingsResult, statsResult] = await Promise.all([
      supabase.from("processed_matches").upsert(processedMatches),
      supabase.from("rankings").upsert(cleanRankings, { onConflict: "name" }),
      supabase.from("global_stats").upsert(cleanStats, { onConflict: "id" }),
    ]);

    if (matchesResult.error)
      throw new Error(`matches upsert: ${matchesResult.error.message}`);
    if (rankingsResult.error)
      throw new Error(`rankings upsert: ${rankingsResult.error.message}`);
    if (statsResult.error)
      throw new Error(`global_stats upsert: ${statsResult.error.message}`);

    logger.info("Supabase write complete ✓");

    // ── 9. Return structured summary (shown in dashboard) ───────────────────
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
