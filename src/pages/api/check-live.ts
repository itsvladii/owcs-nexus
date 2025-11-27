import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const teamName = url.searchParams.get('team');
  
  if (!teamName) {
    return new Response(JSON.stringify({ error: 'No team specified' }), { status: 400 });
  }

  const apiKey = import.meta.env.LIQUIPEDIA_API_KEY;
  const userAgent = 'OWCS-Nexus (your-email@example.com)';

  // Calculate "Now" minus a buffer (e.g. match started in the last 3 hours)
  // We search for matches that are NOT finished (0) but have a start date in the past.
  const now = new Date().toISOString();
  
  // Query: "Unfinished matches for this team where the date is before right now"
  const query = `[[finished::0]] AND [[date::<${now}]] AND ([[opponent1::${teamName}]] OR [[opponent2::${teamName}]])`;

  try {
    const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
    endpoint.searchParams.set('wiki', 'overwatch');
    endpoint.searchParams.set('conditions', query);
    endpoint.searchParams.set('limit', '1');

    const response = await fetch(endpoint.toString(), {
      headers: { 'Authorization': `Apikey ${apiKey}`, 'User-Agent': userAgent }
    });

    const data = await response.json();
    
    // If we found a match, they are live!
    const isLive = data.result && data.result.length > 0;
    const matchData = isLive ? data.result[0] : null;

    return new Response(JSON.stringify({ 
      isLive, 
      opponent: matchData ? (matchData.match2opponents[0].name === teamName ? matchData.match2opponents[1].name : matchData.match2opponents[0].name) : null,
      tournament: matchData?.tournament
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ isLive: false }), { status: 500 });
  }
}