export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchAllSeasonMatches } from "../../lib/stats/fetchMatches";
import { calculateRankings } from "../../lib/elo/calcELO";
import { supabase } from "../../lib/contentScripts/supabase";


// --- THE CORE LOGIC (Shared between API and CLI) ---
async function runSync() {
  const apiKey = import.meta.env?.LIQUIPEDIA_API_KEY || process.env.LIQUIPEDIA_API_KEY;

  // ── 1. Load existing state from DB ──────────────────────────────────────────
  // We fetch the current rankings AND the last sync timestamp in parallel.
  const [{ data: existingRankings }, { data: globalStatsRow }] = await Promise.all([
    supabase.from('rankings').select('*'),
    supabase.from('global_stats').select('last_synced_at').eq('id', 1).single()
  ]);

  const lastSyncedAt: string | null = globalStatsRow?.last_synced_at ?? null;

  // ── 2. Decide: incremental sync or full recalc? ──────────────────────────────
  // If we have a checkpoint AND existing team data, go incremental.
  // Otherwise fall back to a full recalc (first run, or DB was wiped).
  const isIncremental = !!(lastSyncedAt && existingRankings && existingRankings.length > 0);

  if (isIncremental) {
    console.log(`⚡ Incremental sync — fetching matches since ${lastSyncedAt}`);
  } else {
    console.log('🔄 Full recalc — no checkpoint found, processing entire season');
  }

  // ── 3. Fetch only the matches we haven't processed yet ──────────────────────
  console.log("⏳ Fetching matches from Liquipedia...");
  const matches = await fetchAllSeasonMatches(
    apiKey,
    "Nexus-Bot",
    isIncremental ? lastSyncedAt! : undefined  // undefined → season start date
  );

  if (matches.length === 0 && isIncremental) {
    console.log("✅ No new matches since last sync. Nothing to do.");
    return { message: 'No new matches', teams: existingRankings?.length ?? 0 };
  }

  console.log(`📊 Processing ${matches.length} new matches...`);

  // ── 4. Rebuild the RatedTeam map from the DB snapshot ────────────────────────
  // We reconstruct only the fields that calculateRankings actually reads/writes
  // during match processing. Stats-only fields (rankDelta etc.) are recalculated.
  let initialTeams: Record<string, import("../../lib/elo/calcELO").RatedTeam> | undefined;

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
        gamesInCurrentRoster: row.games_in_current_roster ?? row.wins + row.losses,
        lastResetDate: row.last_reset_date ?? undefined
      };
    }
  }

  // ── 5. Run the ELO calculator (incremental or full) ──────────────────────────
  const { rankings, processedMatches, stats } = calculateRankings(matches, {
    isStartSeason: false,
    initialTeams          // undefined on full recalc → calculator starts fresh
  });

  // ── 6. Build clean DB payloads ───────────────────────────────────────────────
  const cleanRankings = rankings.map(r => ({
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
    updated_at: new Date().toISOString()
  }));

  const cleanStats = {
    id: 1,
    biggest_mover: stats.biggestMover,
    biggest_loser: stats.biggestLoser,
    biggest_upsets: stats.biggestUpsets,
    longest_reign: stats.longestReign,
    // Advance the checkpoint to the latest match date we just processed
    last_synced_at: matches.length > 0
      ? matches.reduce((latest, m) => m.date > latest ? m.date : latest, matches[0].date)
      : lastSyncedAt,
    updated_at: new Date().toISOString()
  };

  // ── 7. Persist to Supabase ────────────────────────────────────────────────────
  console.log("💾 Updating Supabase...");
  await supabase.from('processed_matches').upsert(processedMatches).select('id').limit(1);
  await supabase.from('rankings').upsert(cleanRankings, { onConflict: 'name' }).limit(1);
  await supabase.from('global_stats').upsert(cleanStats, { onConflict: 'id' }).limit(1);

  return { message: 'Sync Successful', teams: rankings.length, newMatches: matches.length, incremental: isIncremental };
}

// --- ASTRO API HANDLER ---
export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = import.meta.env?.CRON_SECRET || process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const result = await runSync();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

// --- TERMINAL WRAPPER (Runs only when calling via npx tsx) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🚀 STARTING MANUAL TERMINAL SYNC...");
  runSync()
    .then((result) => {
      console.log("✅ DONE:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ FAILED:", err);
      process.exit(1);
    });
}