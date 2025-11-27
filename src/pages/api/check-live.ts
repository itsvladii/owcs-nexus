export const prerender = false;

import type { APIRoute } from 'astro';

// Helper to Normalize Names (Reuse the logic from your other files if possible)
// For this simple check, a basic lowercase comparison is usually enough, 
// but you can copy your TEAM_ALIASES map here if needed.
/*const TEAM_ALIASES: Record<string, string> = {
  "WAE": "All Gamers Global",
  "Once Again": "Weibo Gaming",
};
function getNormalizedName(name: string) {
  return TEAM_ALIASES[name] || name;
}*/

export const GET: APIRoute = async ({ url }) => {
  const teamNameParam = url.searchParams.get('team');
  
  if (!teamNameParam) {
    return new Response(JSON.stringify({ error: 'No team specified' }), { status: 400 });
  }

  const apiKey = import.meta.env.LIQUIPEDIA_API_KEY;
  const userAgent = 'OWCS-Nexus (barcanvladi@gmail.com)';
  
  const getLogo = (url: string) => url ? `https://wsrv.nl/?url=${encodeURIComponent(url)}` : null;

  const dateObj = new Date();
  const now = dateObj.toISOString().slice(0, 19).replace('T', ' ');
  const yesterdayObj = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = yesterdayObj.toISOString().slice(0, 19).replace('T', ' ');

  try {
    const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
    endpoint.searchParams.set('wiki', 'overwatch');
    // Fetch a few more matches to be safe, then filter locally
    endpoint.searchParams.set('limit', '10'); 
    endpoint.searchParams.set('order', 'date ASC'); // Oldest ongoing match first? Or DESC for newest start.
    
    // QUERY: Just get ALL live/ongoing matches
    // We removed the opponent filter from here to avoid the API error
    endpoint.searchParams.set(
      'conditions', 
      `[[finished::0]] AND [[date::<${now}]] AND [[date::>${yesterday}]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]])`
    );

    const response = await fetch(endpoint.toString(), {
      headers: { 'Authorization': `Apikey ${apiKey}`, 'User-Agent': userAgent }
    });

    const data = await response.json();

    if (!data.result || !Array.isArray(data.result)) {
      return new Response(JSON.stringify({ isLive: false }), { status: 200 });
    }

    // --- LOCAL FILTERING ---
    // Find the match that involves our team
    const targetName =(teamNameParam).toLowerCase();
    
    const match = data.result.find((m: any) => {
        if (!m.match2opponents || m.match2opponents.length < 2) return false;
        
        const op1 =(m.match2opponents[0].name).toLowerCase();
        const op2 =(m.match2opponents[1].name).toLowerCase();
        
        return op1.includes(targetName) || targetName.includes(op1) || 
               op2.includes(targetName) || targetName.includes(op2);
    });

    if (!match) {
        return new Response(JSON.stringify({ isLive: false }), { status: 200 });
    }

    // We found a match!
    const op1 = match.match2opponents[0];
    const op2 = match.match2opponents[1];
    const name1 =(op1.name);
    const name2 =(op2.name);
    
    // Determine opponent name for the badge text
    // If our team matches op1, opponent is op2 (and vice versa)
    const isOp1 = name1.toLowerCase().includes(targetName) || targetName.includes(name1.toLowerCase());
    const opponentName = isOp1 ? name2 : name1;

    return new Response(JSON.stringify({ 
      isLive: true, 
      opponent: opponentName,
      tournament: match.tournament
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ isLive: false }), { status: 500 });
  }
}