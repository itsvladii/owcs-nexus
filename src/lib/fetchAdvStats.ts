// src/lib/faceit.ts

export interface TeamStats {
  winRate: string;       // e.g. "64"
  totalMatches: string;  // e.g. "150"
  totalWins: string;     // e.g. "96"
  currentStreak: string; // e.g. "3"
  longestStreak: string; // e.g. "8"
  recentResults: string[]; // e.g. ["1", "0", "1", "1", "0"] (1=Win, 0=Loss)
}

export async function fetchFaceitStats(
  teamName: string, 
  region: string, 
  apiKey: string
): Promise<TeamStats | null> {
 

  // 2. REGION LOCK
  if (['Korea', 'Asia', 'China', 'Pacific', 'Japan'].includes(region)) {
    return null;
  }

  if (!apiKey) return null;

  try {
    // 3. FIND TEAM ID
    const searchUrl = `https://open.faceit.com/data/v4/search/teams?nickname=${encodeURIComponent(teamName)}&game=ow2&offset=0&limit=1`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const searchData = await searchRes.json();
    const teamId = searchData.items?.[0]?.team_id;

    if (!teamId) return null;

    // 4. FETCH SIMPLE LIFETIME STATS (No math required!)
    const statsUrl = `https://open.faceit.com/data/v4/teams/${teamId}/stats/ow2`;
    const statsRes = await fetch(statsUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const data = await statsRes.json();
    
    if (!data || !data.lifetime) return null;

    // 5. RETURN RAW DATA
    return {
      winRate: data.lifetime['Win rate %'] || '0',
      totalMatches: data.lifetime['Matches'] || '0',
      totalWins: data.lifetime['Wins'] || '0',
      currentStreak: data.lifetime['Current Win Streak'] || '0',
      longestStreak: data.lifetime['Longest Win Streak'] || '0',
      recentResults: data.lifetime['Recent Results'] || []
    };

  } catch (error) {
    console.error(`[FACEIT] Error fetching ${teamName}:`, error);
    return null;
  }
}