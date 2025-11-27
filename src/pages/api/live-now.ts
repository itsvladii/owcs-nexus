export const prerender = false; // Dynamic Route

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.LIQUIPEDIA_API_KEY;
  const userAgent = 'OWCS-Nexus (barcanvladi@gmail.com)';
  
  const getLogo = (url: string) => url ? `https://wsrv.nl/?url=${encodeURIComponent(url)}` : null;

  // --- THE FIX: Proper Date Formatting ---
  const dateObj = new Date();
  
  // Format: YYYY-MM-DD HH:MM:SS
  const now = dateObj.toISOString().slice(0, 19).replace('T', ' ');
  
  // Filter out matches older than 24 hours (Zombies)
  const yesterdayObj = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = yesterdayObj.toISOString().slice(0, 19).replace('T', ' ');

  function shortenTournamentName(name: string): string {
  if (!name) return "";
  let shortName = name;
  
  shortName = shortName.replace(/Overwatch Champions Series/g, "OWCS");
  shortName = shortName.replace(/Overwatch League/g, "OWL");
  shortName = shortName.replace(/Overwatch Contenders/g, "Contenders");
  
  // Turn "2025" into "'25"
  shortName = shortName.replace(/ 20(\d\d)/g, " '$1"); 
  
  // Shorten Regions & Stages
  shortName = shortName.replace(/Stage (\d)/g, "S$1");
  shortName = shortName.replace(/Season (\d)/g, "S$1");
  shortName = shortName.replace(/North America/g, "NA");
  shortName = shortName.replace(/Europe, Middle East & Africa/g, "EMEA");
  shortName = shortName.replace(/South Korea/g, "Korea");
  
  return shortName.trim();
}
  // --------------------------------------

  try {
    const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
    endpoint.searchParams.set('wiki', 'overwatch');
    endpoint.searchParams.set('limit', '1');
    endpoint.searchParams.set('order', 'date DESC');
    
    // QUERY:
    // 1. Not finished (0)
    // 2. Started in the past (date < now)
    // 3. Started RECENTLY (date > yesterday)
    // 4. Tier 1 or 2
    endpoint.searchParams.set(
      'conditions', 
      `[[finished::0]] AND [[date::<${now}]] AND [[date::>${yesterday}]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]])`
    );

    const response = await fetch(endpoint.toString(), {
      headers: { 'Authorization': `Apikey ${apiKey}`, 'User-Agent': userAgent }
    });

    const data = await response.json();

    if (!data.result || data.result.length === 0) {
      return new Response(JSON.stringify(null), { status: 200 });
    }

    const match = data.result[0];
    const op1 = match.match2opponents[0];
    const op2 = match.match2opponents[1];

    const payload = {
      tournament: shortenTournamentName(match.tournament),
      teamA: {
        name: op1.name,
        logo: getLogo(op1.teamtemplate?.imageurl || op1.iconurl),
        score: op1.score ?? 0
      },
      teamB: {
        name: op2.name,
        logo: getLogo(op2.teamtemplate?.imageurl || op2.iconurl),
        score: op2.score ?? 0
      },
      stream: match.stream?.twitch_en_1 ? `https://twitch.tv/${match.stream.twitch_en_1}` : 'https://twitch.tv/overwatch_esports'
    };

    return new Response(JSON.stringify(payload), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify(null), { status: 500 });
  }
}