import { supabase } from "../contentScripts/supabase";

const API_BASE = "https://api.liquipedia.net/api/v3";
const USER_AGENT = "OWCSNexus/1.0 (owcsnexus.gg)";

const PLAYER_FIELDS = [
  "pagename",
  "id",
  "alternateid",
  "name",
  "localizedname",
  "nationality",
  "teampagename",
  "status",
  "extradata",
  "image",
].join(",");

import { flag } from "country-emoji";

const PLAYER_ROLES = ["tank", "dps", "support", "flex"];
const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dm1bfprgq/image/upload/v1779651469";

/**
 * Converts a country name to a flag emoji.
 * Uses the 'country-emoji' library with a manual fallback for esports-specific naming conventions.
 */
function countryToFlag(country: string): string {
  if (!country) return "🏳️";

  // 1. Manual map for names that don't match standard ISO names or are specific to Liquipedia
  const manualMap: Record<string, string> = {
    "South Korea": "🇰🇷",
    "Republic of Korea": "🇰🇷",
    Korea: "🇰🇷",
    "PR China": "🇨🇳",
    Taiwan: "🇹🇼",
    "Chinese Taipei": "🇹🇼",
    "Hong Kong": "🇭🇰",
    "United States": "🇺🇸",
    USA: "🇺🇸",
    UK: "🇬🇧",
    "Great Britain": "🇬🇧",
    England: "🇬🇧",
    Scotland: "🇬🇧",
    Wales: "🇬🇧",
    Russia: "🇷🇺",
    "Russian Federation": "🇷🇺",
    "Czech Republic": "🇨🇿",
    UAE: "🇦🇪",
  };

  if (manualMap[country]) return manualMap[country];

  // 2. Try the library
  const emoji = flag(country);
  return emoji || "🏳️";
}

async function fetchPlayers(
  apiKey: string,
  conditions: string,
  offset = 0,
  limit = 100,
) {
  const endpoint = new URL(`${API_BASE}/player`);
  endpoint.searchParams.set("wiki", "overwatch");
  endpoint.searchParams.set("fields", PLAYER_FIELDS);
  endpoint.searchParams.set("conditions", conditions);
  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("offset", String(offset));
  endpoint.searchParams.set("order", "pagename ASC");

  const res = await fetch(endpoint.toString(), {
    headers: {
      Authorization: `Apikey ${apiKey}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (Array.isArray(data.result)) return data.result;
  if (data.result && typeof data.result === "object") {
    return Object.values(data.result);
  }
  return [];
}

export async function runSyncPlayers() {
  const API_KEY = import.meta.env?.LIQUIPEDIA_API_KEY_PLAYERS ||
    process.env.LIQUIPEDIA_API_KEY_PLAYERS;
  if (!API_KEY) {
    throw new Error("Missing LIQUIPEDIA_API_KEY environment variable");
  }

  console.log("🎮 Syncing players for all ranked teams...");

  // 1. Fetch all teams from rankings to know which rosters to sync
  const { data: rankings, error: rankingsError } = await supabase
    .from("rankings")
    .select("name");

  if (rankingsError || !rankings) {
    throw new Error(
      "Could not fetch rankings: " + (rankingsError?.message || "No data"),
    );
  }

  console.log(`Found ${rankings.length} teams in rankings`);

  // Prepare team name mappings for Liquipedia (handles spaces vs underscores)
  const teamNamesMap: Record<string, string> = {};
  rankings.forEach((r) => {
    const underscoreName = r.name.replace(/\s+/g, "_");
    teamNamesMap[underscoreName.toLowerCase()] = r.name;
    teamNamesMap[r.name.toLowerCase()] = r.name;
  });

  const uniqueTeamNames = rankings.flatMap((t) => [
    t.name,
    t.name.replace(/\s+/g, "_"),
  ]);

  // 2. Fetch players in batches to avoid overly long URLs
  const BATCH_SIZE = 20;
  let allPlayers: any[] = [];

  for (let i = 0; i < uniqueTeamNames.length; i += BATCH_SIZE) {
    const batch = uniqueTeamNames.slice(i, i + BATCH_SIZE);
    const teamConditions = batch
      .map((name) => `[[teampagename::${name}]]`)
      .join(" OR ");

    const conditions = [
      `(${teamConditions})`,
      `([[extradata_role::tank]] OR [[extradata_role::dps]] OR [[extradata_role::support]] OR [[extradata_role::flex]])`,
      `[[status::Active]]`, // Exclude former/inactive players
    ].join(" AND ");

    console.log(`  Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

    let offset = 0;
    while (true) {
      const players = await fetchPlayers(API_KEY, conditions, offset, 100);
      allPlayers = allPlayers.concat(players);
      if (players.length < 100) break;
      offset += 100;
      // Respectful delay
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`Fetched ${allPlayers.length} total players from Liquipedia.`);

  // 3. Filter and Map players
  const playersUpsert = allPlayers
    .filter((p) => {
      const role = (p.extradata?.role || "").toLowerCase();
      return PLAYER_ROLES.includes(role);
    })
    .map((p) => {
      const extra = p.extradata || {};
      const role = (extra.role || "").toLowerCase();
      const teamKey = (p.teampagename || "").toLowerCase();
      const teamName = teamNamesMap[teamKey] || p.teampagename;

      const normalizedGamertag = (p.id || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const cloudinaryUrl = `${CLOUDINARY_BASE}/${normalizedGamertag}.png`;

      return {
        id: p.pagename,
        gamertag: p.id,
        real_name: p.name || null,
        nationality: p.nationality || null,
        flag: countryToFlag(p.nationality || ""),
        role: role || null,
        team_name: teamName || null,
        cloudinary_url: cloudinaryUrl,
        updated_at: new Date().toISOString(),
      };
    });

  console.log(`Filtered down to ${playersUpsert.length} valid players.`);

  // 4. Upsert to 'players' table
  if (playersUpsert.length > 0) {
    const { error: playersError } = await supabase
      .from("players")
      .upsert(playersUpsert, { onConflict: "id" });

    if (playersError) {
      console.error("Error upserting players:", playersError.message);
    }
  }

  // 5. Update 'rankings' table with roster data to catch transfers and allow easy UI access
  const rosterByTeam: Record<string, any[]> = {};
  playersUpsert.forEach((p) => {
    if (!p.team_name) return;
    if (!rosterByTeam[p.team_name]) rosterByTeam[p.team_name] = [];
    rosterByTeam[p.team_name].push({
      id: p.id,
      gamertag: p.gamertag,
      real_name: p.real_name,
      role: p.role,
      flag: p.flag,
      cloudinary_url: p.cloudinary_url,
    });
  });

  console.log(
    `Updating rosters for ${Object.keys(rosterByTeam).length} teams...`,
  );

  // Warn about any ranked teams that got zero players — likely a name mismatch
  const teamsWithNoRoster = rankings
    .map((r) => r.name)
    .filter((name) => !rosterByTeam[name]);
  if (teamsWithNoRoster.length > 0) {
    console.warn(
      `⚠️  No players found for ${teamsWithNoRoster.length} ranked team(s):`,
    );
    teamsWithNoRoster.forEach((name) => console.warn(`   · "${name}"`));
  }

  for (const [teamName, roster] of Object.entries(rosterByTeam)) {
    const { error: updateError } = await supabase
      .from("rankings")
      .update({ roster })
      .eq("name", teamName);

    if (updateError) {
      console.warn(
        `Could not update roster for team ${teamName}: ${updateError.message}`,
      );
    } else {
      console.log(`  ✓ ${teamName}: ${roster.length} player(s)`);
    }
  }

  return {
    success: true,
    playersSynced: playersUpsert.length,
    teamsUpdated: Object.keys(rosterByTeam).length,
  };
}
