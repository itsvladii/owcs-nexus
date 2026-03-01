export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchAllSeasonMatches } from "../../lib/stats/fetchMatches";
import { calculateRankings } from "../../lib/elo/calcELO";
import { supabase } from "../../lib/contentScripts/supabase";


// --- THE CORE LOGIC (Shared between API and CLI) ---
async function runSync() {
  const apiKey = import.meta.env?.LIQUIPEDIA_API_KEY || process.env.LIQUIPEDIA_API_KEY;
  
  console.log("⏳ Fetching matches from Liquipedia...");
  const matches = await fetchAllSeasonMatches(apiKey, "Nexus-Bot");
  
  console.log(`📊 Processing ${matches.length} matches...`);
  const { rankings, processedMatches, stats } = calculateRankings(matches, { isStartSeason: false });
  // 📊 Clean Rankings Payload (Matches Screenshot 2026-03-01 alle 15.31.45.png)
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
  updated_at: new Date().toISOString()
}));

// 📈 Clean Global Stats Payload (Matches Screenshot 2026-03-01 alle 15.25.59.jpg)
const cleanStats = {
  id: 1,
  biggest_mover: stats.biggestMover,
  biggest_loser: stats.biggestLoser,
  biggest_upsets: stats.biggestUpsets,
  longest_reign: stats.longestReign,
  updated_at: new Date().toISOString()
};
  console.log("💾 Updating Supabase...");
  // Use minimal returning to stay under Vercel's 10s timeout when running as an API
  await supabase.from('processed_matches').upsert(processedMatches).select('id').limit(1);
  await supabase.from('rankings').upsert(cleanRankings, { onConflict: 'name' }).limit(1);;
  await supabase.from('global_stats').upsert(cleanStats, { onConflict: 'id' }).limit(1);;

  return { message: 'Sync Successful', teams: rankings.length };
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