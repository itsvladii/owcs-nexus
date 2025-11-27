export const prerender = false; // Dynamic Route

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.LIQUIPEDIA_API_KEY;
  const userAgent = 'OWCS-Nexus (your-email@example.com)';
  
  // Helper to proxy images
  const getLogo = (url: string) => url ? `https://wsrv.nl/?url=${encodeURIComponent(url)}` : null;

  const now = new Date().toISOString();

  try {
    const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
    endpoint.searchParams.set('wiki', 'overwatch');
    endpoint.searchParams.set('limit', '1'); // We just need the main event
    endpoint.searchParams.set('order', 'date DESC'); // Start time
    
    // QUERY:
    // 1. Not finished (0)
    // 2. Started in the past (date < now)
    // 3. Tier 1 or 2 (Major/S-Tier)
    endpoint.searchParams.set(
      'conditions', 
      `[[finished::0]] AND [[date::<${now}]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]])`
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

    // Format Payload
    const payload = {
      tournament: match.tournament,
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