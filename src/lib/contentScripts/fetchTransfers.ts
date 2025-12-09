import { getCollection } from 'astro:content';

export interface Transfer {
  date: string;
  player: string;
  role: string;
  from: string;
  to: string;
  isImportant: boolean;
}

export async function getLatestTransfers(): Promise<Transfer[]> {
  const apiKey = import.meta.env.LIQUIPEDIA_API_KEY;
  const userAgent = 'OWCS-Nexus-App/1.0';

  if (!apiKey) return [];

  // 1. Prepare Local Teams (for "Meaningful" filter)
  const localTeams = await getCollection('teams');
  const knownTeamNames = new Set(localTeams.flatMap(t => [
      t.data.name.toLowerCase(), 
      t.slug.toLowerCase().replace(/-/g, ' ')
  ]));

  // 2. Build Endpoint
  const endpoint = new URL('https://api.liquipedia.net/api/v3/transfer');
  endpoint.searchParams.set('wiki', 'overwatch');
  endpoint.searchParams.set('limit', '50');
  endpoint.searchParams.set('order', 'date DESC');
  
  // Last 90 days
  const filterDate = new Date();
  filterDate.setDate(filterDate.getDate() - 90);
  endpoint.searchParams.set('conditions', `[[date::>${filterDate.toISOString().split('T')[0]}]]`);

  try {
    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Apikey ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': userAgent
      }
    });

    if (!response.ok) throw new Error('API Error');
    const json = await response.json();
    const rawList = json.result || [];

    // 3. Map Results
    const transfers: Transfer[] = rawList.map((t: any) => {
      const fromTeam = t.fromteam || "Free Agent";
      const toTeam = t.toteam || "Free Agent";

      // Check Importance
      const isImportant = knownTeamNames.has(fromTeam.toLowerCase()) || 
                          knownTeamNames.has(toTeam.toLowerCase());

      // --- FIX: ROLE EXTRACTION ---
      // 1. Try 'extradata.position' (e.g. "Support")
      // 2. Try 'extradata.icon' (fallback)
      // 3. Try 'role1' (often empty but check anyway)
      // 4. Default to "Player"
      let role = "Player";
      
      if (t.extradata) {
          role = t.extradata.position || t.extradata.icon || role;
      } else if (t.role1) {
          role = t.role1;
      }

      return {
        date: t.date,
        player: t.player,
        role: role, 
        from: fromTeam,
        to: toTeam,
        isImportant
      };
    });

    return transfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error("❌ Failed to fetch transfers:", error);
    return [];
  }
}