// src/lib/contentScripts/fetchTransfers.ts
import { supabase } from './supabase'; // Make sure this path points to your initialized client

export interface Transfer {
  date: string;
  player: string;
  role: string;
  from: string;
  to: string;
  isImportant: boolean;
}

export async function getLatestTransfers(): Promise<Transfer[]> {
  const apiKey = import.meta.env.LIQUIPEDIA_API_KEY; // Ensure this is in your .env
  const userAgent = 'OWCS-Nexus-App/1.0';

  if (!apiKey) {
    console.warn("⚠️ No Liquipedia API Key found.");
    return [];
  }

  // --- REWORK START: Fetch "Whitelist" from Supabase ---
  
  // 1. Fetch all team names from your Stock Market DB
  const { data: dbTeams, error } = await supabase
    .from('teams')
    .select('name');

  if (error) {
    console.error("❌ Failed to fetch teams from DB:", error);
    return [];
  }

  // 2. Create a Set of lowercase names for instant lookup
  // We filter out any nulls just in case
  const knownTeamNames = new Set(
    (dbTeams || [])
      .map(t => t.name.toLowerCase().trim())
  );
  
  // --- REWORK END ---

  // 3. Build Liquipedia Endpoint (Same as before)
  const endpoint = new URL('https://api.liquipedia.net/api/v3/transfer');
  endpoint.searchParams.set('wiki', 'overwatch');
  endpoint.searchParams.set('limit', '50');
  endpoint.searchParams.set('order', 'date DESC');
  
  // Filter: Last 90 days
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

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    const json = await response.json();
    const rawList = json.result || [];

    // 4. Map & Filter Results
    const transfers: Transfer[] = rawList.map((t: any) => {
      const fromTeam = t.fromteam || "Free Agent";
      const toTeam = t.toteam || "Free Agent";

      // 🚨 THE CRITICAL CHECK 🚨
      // We check if EITHER the "From" team OR the "To" team exists in our Supabase Set
      const isImportant = knownTeamNames.has(fromTeam.toLowerCase()) || 
                          knownTeamNames.has(toTeam.toLowerCase());

      // Role Extraction Logic (Kept mostly same)
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
        isImportant // This flag now relies on your DB, not local files
      };
    });

    // Return newest first
    return transfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error("❌ Failed to fetch transfers:", error);
    return [];
  }
}