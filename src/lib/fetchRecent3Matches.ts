export interface Match {
  teamLeft: string;
  scoreLeft: string | number;
  teamRight: string;
  scoreRight: string | number;
  tournament: string;
  date: string;
  // We keep the raw data accessible for the ELO calculator if needed
  match2opponents?: any;
  winner?: string;
}

export async function fetchRecent3Matches(
  teamName: string,
  apiKey: string,
  userAgent: string
): Promise<Match[]> {
  
  if (!apiKey) {
    console.warn("Fetch skipped: LIQUIPEDIA_API_KEY is not set.");
    return [];
  }

  try {
    // 1. THE QUERY
    // We ask for the 50 most recent FINISHED matches in general.
    // We do NOT filter by team name in the API because that query is fragile.
    const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
    endpoint.searchParams.set('wiki', 'overwatch');
    endpoint.searchParams.set('limit', '1000'); 
    endpoint.searchParams.set('order', 'date DESC'); // Newest first
    endpoint.searchParams.set('conditions', '([[finished::0]]) AND [[date::>today]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]])'); // Only completed matches

    // 2. THE FETCH
    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Apikey ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': userAgent
      }
    });

    if (!response.ok) {
      console.warn(`Liquipedia API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    if (!data.result || !Array.isArray(data.result)) {
      return [];
    }

    // 3. THE FILTER (Local Logic)
    // We loop through the matches to find the ones involving our team.
    const teamNameLower = teamName.toLowerCase();
    const teamMatches = data.result.filter((match: any) => {
      // Safety Check: Does the match have valid opponents?
      if (!match.match2opponents || !Array.isArray(match.match2opponents) || match.match2opponents.length < 2) {
        return false;
      }

      const op1 = match.match2opponents[0].name;
      const op2 = match.match2opponents[1].name;
      console.log(match)

      // Check if our team is either Opponent 1 OR Opponent 2
      // We use 'includes' to catch slight variations (e.g. "Falcons" vs "Team Falcons")
      return op1.includes(teamNameLower) || 
             teamNameLower.includes(op1) || 
             op2.includes(teamNameLower) || 
             teamNameLower.includes(op2);
    });
    // 4. THE FORMATTING
    // Return the top 3 matches, formatted cleanly
    
    return teamMatches.slice(0, 3).map((match: any) => ({
      teamLeft: match.match2opponents[0].name || 'TBD',
      scoreLeft: match.match2opponents[0].score,
      teamRight: match.match2opponents[1].name || 'TBD',
      scoreRight: match.match2opponents[1].score,
      tournament: match.tournament,
      date: new Date(match.date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric'
      }),
      // Pass raw data through for other uses (like ELO)
      match2opponents: match.match2opponents,
      winner: match.winner
    }));

  } catch (error) {
    console.error("Error fetching matches:", error);
    return [];
  }
}
