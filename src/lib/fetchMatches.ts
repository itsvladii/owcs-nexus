// 1. Define the interfaces
// We need a flexible type because the API returns complex nested JSON
export interface Match {
  teamLeft: string;
  scoreLeft: string | number;
  teamRight: string;
  scoreRight: string | number;
  tournament: string;
  date: string;
  
  // These fields are crucial for the ELO calculator & Logos
  match2opponents?: {
    opponents: {
      name: string;
      icon: string;
      iconurl: string; // <--- This is the logo URL we need!
      score: number;
    }[];
  };
  winner?: string;
}

// 2. Fetch Recent Matches (For Individual Team Pages)
export async function fetchRecentMatches(
  teamName: string,
  apiKey: string,
  userAgent: string
): Promise<Match[]> {
  
  if (!apiKey) {
    console.warn("Fetch skipped: LIQUIPEDIA_API_KEY is not set.");
    return [];
  }

  try {
    // Build the GET request URL
    const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
    endpoint.searchParams.set('wiki', 'overwatch');
    endpoint.searchParams.set('limit', '50'); 
    endpoint.searchParams.set('order', 'date DESC'); 
    endpoint.searchParams.set('conditions', `[[finished::1] AND [[date::>2025-01-24]] AND [[date::<2025-11-30]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]])`);

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Apikey ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': userAgent
      },
    });

    if (!response.ok) {
      console.warn(`Liquipedia API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    if (!data.result || data.result.length === 0) {
      return [];
    }
    
    // Filter locally for the specific team
    const filteredMatches = data.result.filter((match: any) => {
      if (!match?.match2opponents?.opponents) return false;
      return match.match2opponents.opponents.some((op: any) => 
        op.name.toLowerCase() === teamName.toLowerCase()
      );
    });

    // Map to our clean interface
    return filteredMatches.slice(0, 3).map((match: any) => ({
      teamLeft: match.match2opponents.opponents[0]?.name || 'TBD',
      scoreLeft: match.match2opponents.opponents[0]?.score ?? '-',
      teamRight: match.match2opponents.opponents[1]?.name || 'TBD',
      scoreRight: match.match2opponents.opponents[1]?.score ?? '-',
      tournament: match.tournament,
      date: match.date,
      // Pass through the raw data just in case
      match2opponents: match.match2opponents,
      winner: match.winner
    }));

  } catch (error) {
    console.error("Error fetching Liquipedia matches:", error);
    return [];
  }
}


// 3. Fetch Season Matches (For Global Power Rankings)
export async function fetchAllSeasonMatches(apiKey: string, userAgent: string) {
  if (!apiKey) return [];

  try {
    const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
    endpoint.searchParams.set('wiki', 'overwatch');
    endpoint.searchParams.set('limit', '1000');
    endpoint.searchParams.set('order', 'date ASC');
    endpoint.searchParams.set('conditions', '[[finished::1]] AND [[date::>2025-01-24]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]]) AND ([[series::Overwatch Champions Series]] OR [[series::Esports World Cup]])');

    console.log(`[Liquipedia] Fetching season matches...`);

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Apikey ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': userAgent
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // --- SAFETY FIX ---
      // Ensure 'result' is treated as an array, even if the API acts weird.
      let resultsArray: any[] = [];
      
      if (Array.isArray(data.result)) {
        resultsArray = data.result;
      } else if (data.result && typeof data.result === 'object') {
        // If it returns an object map (rare but possible), convert to array
        resultsArray = Object.values(data.result);
      }

      console.log(`[Liquipedia] Successfully fetched ${resultsArray.length} matches for rankings.`);
      return resultsArray;
      // ------------------
      
    } else {
      console.warn(`Liquipedia Ranking API error: ${response.status} ${response.statusText}`);
      return [];
    }
  } catch (e) {
    console.error("Error fetching season matches:", e);
    return [];
  }
}

