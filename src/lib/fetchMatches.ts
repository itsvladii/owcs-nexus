// src/lib/liquipedia.ts

export interface Match {
  teamLeft: string;
  scoreLeft: string | number;
  teamRight: string;
  scoreRight: string | number;
  tournament: string;
  countdown: string;
}

export async function fetchMatches(
  teamName: string, // This is your 'liquipediaName'
  apiKey: string,
  userAgent: string
): Promise<Match[]> {
  
  if (!apiKey) {
    console.warn("Fetch skipped: LIQUIPEDIA_API_KEY is not set.");
    return [];
  }

  try {
    const endpoint = 'https://api.liquipedia.net/api/v3/match';

    // --- THIS IS THE NEW QUERY ---
    // We are using POST and asking the API to do the filtering.
    // We are using the 'opponent_names' field, which is designed for this.
    const queryPayload = {
      wiki: 'overwatch',
      limit: 3,
      order: 'date DESC',
      conditions: `[[finished::1]] AND [[match2opponents.name::${teamName}]]`
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': userAgent
      },
      body: JSON.stringify(queryPayload)
    });

    if (!response.ok) {
      console.warn(`Liquipedia API error: ${response.status} ${response.statusText}`);
      // Log the error if the query is bad
      if (response.status === 400) {
        console.error("API Error: Bad Request. The query is invalid.", await response.json());
      }
      return [];
    }

    const data = await response.json();

    if (!data.result || data.result.length === 0) {
      console.log(`[DEBUG] API returned 0 recent matches for "${teamName}".`);
      return [];
    }
    
    console.log(`✅ SUCCESS! Found ${data.result.length} recent matches for "${teamName}".`);

    // The API did the filtering, so we just map!
    return data.result.map(match => ({
      teamLeft: match.match2opponents.opponents[0] ? match.match2opponents.opponents[0].name : 'TBD',
      scoreLeft: match.match2opponents.opponents[0]?.score ?? '-',
      teamRight: match.match2opponents.opponents[1] ? match.match2opponents.opponents[1].name : 'TBD',
      scoreRight: match.match2opponents.opponents[1]?.score ?? '-',
      tournament: match.tournament,
      countdown: new Date(match.date).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
      }),
    }));

  } catch (error) {
    console.error("Error fetching Liquipedia matches:", error);
    return [];
  }
}