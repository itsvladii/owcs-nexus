// src/pages/api/sync-elo.ts
export const prerender = false; // Must be server-rendered
import type { APIRoute } from 'astro';
import { fetchAllSeasonMatches } from "../../lib/stats/fetchMatches";
import { calculateRankings } from "../../lib/elo/calcELO";
import { supabase } from "../../lib/contentScripts/supabase";

export const GET: APIRoute = async ({ request }) => {
  // 🔒 Security: Check for Vercel's Cron Secret
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${import.meta.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const matches = await fetchAllSeasonMatches(import.meta.env.LIQUIPEDIA_API_KEY, "Nexus-Bot");
    const { rankings, processedMatches, stats } = calculateRankings(matches, { isStartSeason: false });

    // Update Supabase tables
    await supabase.from('rankings').upsert(rankings.map(r => ({ ...r, name: r.name })));
    await supabase.from('processed_matches').upsert(processedMatches);
    await supabase.from('global_stats').upsert({ id: 1, ...stats });

    return new Response(JSON.stringify({ message: 'Sync Successful' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};