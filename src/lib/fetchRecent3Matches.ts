// src/lib/liquipedia.ts

export interface Match {
  teamLeft: string;
  scoreLeft: string | number;
  logoLeft: string | null;
  teamRight: string;
  scoreRight: string | number;
  logoRight: string | null;
  tournament: string;
  date: string;
}

const PROXY_BASE = "https://wsrv.nl/?url=";
const TEAM_ALIASES: Record<string, string> = {
  "All Gamers Global": "WAE",
  "WAY": "WAE",
  "Once Again": "Weibo Gaming",
  "Sign Esports": "NTMR",
  "1DIPVS100GORILLAS": "Quick Esports",
  "Team CC (Chinese orgless team)": "Team CC",
  "Cheeseburger (Korean team)": "Cheeseburger"
};

// Helper to get the best logo URL from an opponent object
function getLogo(opponent: any): string | null {
  if (!opponent) return null;
  
  let url = null;
  // 1. Try teamtemplate (Best quality)
  if (opponent.teamtemplate && opponent.teamtemplate.imageurl) {
    url = opponent.teamtemplate.imageurl;
  } 
  // 2. Try direct iconurl
  else if (opponent.iconurl) {
    url = opponent.iconurl;
  }

  // 3. Return proxied URL
  return url ? `${PROXY_BASE}${encodeURIComponent(url)}` : null;
}

function getNormalizedTeamName(name: string): string {
  return TEAM_ALIASES[name] || name;
}

// --- 1. FETCH RECENT MATCHES (For Team Page) ---
export async function fetchRecent3Matches(
  teamName: string,
  apiKey: string,
  userAgent: string
): Promise<Match[]> {
  
  if (!apiKey || !teamName) return [];

  try {
    const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
    endpoint.searchParams.set('wiki', 'overwatch');
    endpoint.searchParams.set('limit', '900'); 
    endpoint.searchParams.set('order', 'date DESC'); 
    endpoint.searchParams.set('conditions', '[[finished::1]] AND [[date::>2025-01-24]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]])'); // Only finished games

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Apikey ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': userAgent
      }
    });

    if (!response.ok) return [];
    const data = await response.json();
    if (!data.result || !Array.isArray(data.result)) return [];

    // FILTER LOCALLY
    const target = teamName;
    
    const teamMatches = data.result.filter((match: any) => {
      if (!match.match2opponents || match.match2opponents.length < 2) return false;
      
      const op1 = getNormalizedTeamName(match.match2opponents[0].name);
      const op2 = getNormalizedTeamName(match.match2opponents[1].name);

      // Check if our team matches either opponent
      return op1.includes(target) || target.includes(op1) || 
             op2.includes(target) || target.includes(op2);
    });

    // MAP & CLEAN DATA
    return teamMatches.slice(0, 3).map((match: any) => {
      const op1 = match.match2opponents[0];
      const op2 = match.match2opponents[1];
      const logo1=getLogo(op1)
      const logo2=getLogo(op2)
      

      // Fix negative scores
      const s1 = op1.score === -1 ? 0 : (op1.score ?? 0);
      const s2 = op2.score === -1 ? 0 : (op2.score ?? 0);
    

      return {
        teamLeft: getNormalizedTeamName(op1.name) || 'TBD',
        scoreLeft: s1,
        logoLeft: logo1,
        
        teamRight: getNormalizedTeamName(op2.name) || 'TBD',
        scoreRight: s2,
        logoRight: logo2,

        tournament: match.tournament,
        date: new Date(match.date).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric'
        }),
      };
    });

  } catch (error) {
    console.error("Error fetching matches:", error);
    return [];
  }
}

// --- 2. FETCH SEASON MATCHES (For Global Power Rankings) ---
export async function fetchAllSeasonMatches(apiKey: string, userAgent: string) {
  // ... (Your existing rankings fetcher code) ...
  // Just keep this function as it was to avoid breaking the rankings page!
  if (!apiKey) return [];
  try {
    const endpoint = new URL('https://api.liquipedia.net/api/v3/match');
    endpoint.searchParams.set('wiki', 'overwatch');
    endpoint.searchParams.set('limit', '700');
    endpoint.searchParams.set('order', 'date ASC');
    endpoint.searchParams.set('conditions', '[[finished::1]] AND [[date::>2025-01-01]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]])');

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: { 'Authorization': `Apikey ${apiKey}`, 'Accept': 'application/json', 'User-Agent': userAgent }
    });

    if (response.ok) {
      const data = await response.json();
      return data.result || [];
    }
    return [];
  } catch (e) { return []; }
}