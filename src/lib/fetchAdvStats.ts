// src/lib/faceit.ts

export interface TeamStats {
  winRate: number;
  matchesPlayed: number;
  wins: number;
  currentStreak: number; // e.g. +3 or -1
  bestMap: string;
}

export async function fetchFaceitStats(
  teamName: string, 
  region: string, 
  apiKey: string
): Promise<TeamStats | null> {

    
  // 1. REGION CHECK: Only run for supported regions
  // "Asia" and "Korea" are managed by WaraGG, so no API.
  if (['Korea', 'Asia', 'China', 'Pacific', 'Japan'].includes(region)) {
    return null;
  }

  if (!apiKey) {
    console.warn(`[FACEIT] Skipped ${teamName}: No API Key.`);
    return null;
  }

  try {
    // 2. FIND TEAM ID
    // We search for the team by name to get their FACEIT ID.
    // Note: This searches the "ow2" game explicitly.
    const searchUrl = `https://open.faceit.com/data/v4/search/teams?nickname=${encodeURIComponent(teamName)}&game=ow2&offset=0&limit=1`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const searchData = await searchRes.json();
    //console.log(searchData)
    const teamId = searchData.items?.[0]?.team_id;
    //console.log(teamId)

    /*if (!teamId) {
      console.log(`[FACEIT] Could not find team: "${teamName}"`);
      return null;
    }*/

    // 3. FETCH TEAM STATS
    const statsUrl = `https://open.faceit.com/data/v4/teams/${teamId}/stats/ow2`;
    const statsRes = await fetch(statsUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const statsData = await statsRes.json();
    
    // If they have no stats (new team), return null
    if (!statsData || !statsData.lifetime) return null;

    // 4. FORMAT DATA
    // FACEIT returns detailed map stats, we can pick the best one.
    const mapSegments = statsData.segments || [];
    // Sort by win rate to find best map
    const bestMapObj = mapSegments.sort((a: any, b: any) => parseInt(b.stats['Win Rate %']) - parseInt(a.stats['Win Rate %']))[0];
    console.log(bestMapObj)

    return {
      matchesPlayed: parseInt(statsData.lifetime['Matches'] || '0'),
      wins: parseInt(statsData.lifetime['Wins'] || '0'),
      winRate: parseInt(statsData.lifetime['Win rate %'] || '0'),
      currentStreak: parseInt(statsData.lifetime['Current Undefeated Streak'] || '0'),
      bestMap: bestMapObj ? bestMapObj.label : 'Unknown'
    };

  } catch (error) {
    console.error(`[FACEIT] Error fetching ${teamName}:`, error);
    return null;
  }
}