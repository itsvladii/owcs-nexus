import 'dotenv/config'; // Make sure to run: npm install dotenv
// Usage: npx tsx scripts/calculate-2026-start.ts

const API_KEY = process.env.LIQUIPEDIA_API_KEY;
const USER_AGENT = "OWCS-Nexus-Admin/1.0";
const BASE_BASELINE = 1200;
const REGRESSION_FACTOR = 0.5; // 50% Decay towards mean

if (!API_KEY) {
  console.error("❌ Error: LIQUIPEDIA_API_KEY not found in environment.");
  process.exit(1);
}

// --- CONFIGURATION ---
const TEAM_ALIASES: Record<string, string> = {
  "All Gamers Global": "WAE",
  "WAY": "WAE",
  "Once Again": "Weibo Gaming",
  "Sign Esports": "NTMR",
  "1DIPVS100GORILLAS": "Quick Esports",
  "Team CC (Chinese orgless team)": "Team CC",
  "Cheeseburger (Korean team)": "Cheeseburger"
};

const TOURNAMENT_WEIGHTS: Record<string, number> = {
  'World Finals': 2.5, 'Midseason': 2.0, 'Major': 1.5,'Champions Clash': 2.0, 'Road to World Finals': 1.5,
  'Stage': 1.0, 'Qualifier': 0.5, 'default': 1.0
};

// --- HELPERS ---
function getNormalizedTeamName(name: string) { return TEAM_ALIASES[name] || name; }
function getKFactor(name: string) {
  const key = Object.keys(TOURNAMENT_WEIGHTS).find(k => name.includes(k));
  return (key ? TOURNAMENT_WEIGHTS[key] : TOURNAMENT_WEIGHTS['default']) * 20; // K=20 (Safe Mode)
}
function getMovMultiplier(s1: number, s2: number) {
  const diff = Math.abs(s1 - s2);
  if (diff >= 3) return 1.2;
  if (diff === 2) return 1.0;
  return 0.8;
}
function inferRegion(name: string) {
  if (name.includes("Korea") || name.includes("Asia")) return "Korea";
  if (name.includes("North America") || name.includes("NA")) return "North America";
  if (name.includes("EMEA") || name.includes("Europe")) return "EMEA";
  if (name.includes("Japan")) return "Japan";
  if (name.includes("Pacific")) return "Pacific";
  if (name.includes("China")) return "China";
  return "default";
}

// --- FETCH MATCHES ---
async function fetch2025Season() {
  console.log("🚀 Fetching 2025 Season Data...");
  const url = new URL('https://api.liquipedia.net/api/v3/match');
  url.searchParams.set('wiki', 'overwatch');
  url.searchParams.set('limit', '2000'); // Get EVERYTHING
  url.searchParams.set('order', 'date ASC');
  // STRICTLY 2025 MATCHES
  url.searchParams.set('conditions', '[[finished::1]] AND [[date::>2024-02-26]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]]) AND ([[series::Overwatch Champions Series]] OR [[series::Esports World Cup]])');

  try {
    const res = await fetch(url.toString(), { headers: { 'Authorization': `Apikey ${API_KEY}`, 'User-Agent': USER_AGENT } });
    const data = await res.json();
    console.log(`✅ Loaded ${data.result.length} matches.`);
    return data.result || [];
  } catch (e) {
    console.error("Fetch failed:", e);
    return [];
  }
}

// --- SIMULATION ---
function runSimulation(matches: any[]) {
  const teams: Record<string, any> = {};
  
  const getTeam = (name: string, tournament: string) => {
    if (!teams[name]) {
      const region = inferRegion(tournament);
      // EVERYONE STARTS EQUAL (The Experiment)
      teams[name] = { name, region, rating: BASE_BASELINE, wins: 0, losses: 0 };
    }
    return teams[name];
  };

  for (const match of matches) {
    if (!match.match2opponents || match.match2opponents.length < 2) continue;
    const nameA = getNormalizedTeamName(match.match2opponents[0].name);
    const nameB = getNormalizedTeamName(match.match2opponents[1].name);
    if (!nameA || !nameB) continue;
    
    const teamA = getTeam(nameA, match.tournament);
    const teamB = getTeam(nameB, match.tournament);

    // Math
    const s1 = Number(match.match2opponents[0].score ?? 0);
    const s2 = Number(match.match2opponents[1].score ?? 0);
    const winnerId = match.winner;
    const scoreA = winnerId === "1" ? 1 : 0;
    const scoreB = winnerId === "2" ? 1 : 0;

    let k = getKFactor(match.tournament);
    const movMultiplier = getMovMultiplier(s1, s2);
    const baseK = k; // Save for logging
    k = k * movMultiplier;
    
    // LAN Protection (Defeat Mercy)
    let kA = k, kB = k;
    if (k > 30) {
       if (scoreA === 0) kA = k * 0.5;
       if (scoreB === 0) kB = k * 0.5;
    }

    const ea = 1 / (1 + Math.pow(10, (teamB.rating - teamA.rating) / 400));
    const eb = 1 / (1 + Math.pow(10, (teamA.rating - teamB.rating) / 400));

    teamA.rating += kA * (scoreA - ea);
    teamB.rating += kB * (scoreB - eb);
    
    if (scoreA) { teamA.wins++; teamB.losses++; } else { teamB.wins++; teamA.losses++; }
  }
  
  return Object.values(teams);
}

async function main() {
  const matches = await fetch2025Season();

  console.log("\n📋 TOURNAMENT AUDIT (Verified Events):");
  const uniqueTournaments = new Set(matches.map((m: any) => m.tournament));
  const sortedTournaments = Array.from(uniqueTournaments).sort();
  
  sortedTournaments.forEach(t => {
      // Optional: Mark High-Value events for clarity
      const isMajor = t.includes("Major") || t.includes("World") || t.includes("Midseason");
      console.log(` ${isMajor ? '⭐' : '•'} ${t}`);
  });
  console.log(`\n(Total: ${sortedTournaments.length} Competitions)\n`);
  
  // 1. RUN "FAIR WORLD" SIMULATION
  // See who rises to the top when starting equal.
  const results = runSimulation(matches);

  console.log("\n📊 2025 SEASON PERFORMANCE (Raw ELO):");
  const regions = ['Korea', 'North America', 'EMEA', 'China', 'Japan', 'Pacific'];
  
  const nextSeasonConfig: Record<string, number> = {};

  regions.forEach(region => {
     // Filter for teams that actually played a season (5+ games)
     const regionalTeams = results
        .filter((t: any) => t.region === region && (t.wins + t.losses) >= 5)
        .sort((a: any, b: any) => b.rating - a.rating);
     
     // Take Top 3 to determine "Region Strength"
     const top3 = regionalTeams.slice(0, 3);
     
     if (top3.length > 0) {
       const avgElo = top3.reduce((sum, t) => sum + t.rating, 0) / top3.length;
       
       // CALCULATE DECAY (Soft Reset)
       // New Start = 1200 + ((End - 1200) * 0.5)
       const nextStart = Math.round(BASE_BASELINE + ((avgElo - BASE_BASELINE) * REGRESSION_FACTOR));
       nextSeasonConfig[region] = nextStart;

       console.log(`\n🌍 ${region.toUpperCase()}`);
       console.log(`   Top Team: ${top3[0].name} (${Math.round(top3[0].rating)})`);
       console.log(`   Avg Top 3: ${Math.round(avgElo)}`);
       console.log(`   -> 2026 STARTING ELO: ${nextStart}`);
     } else {
       console.log(`\n🌍 ${region.toUpperCase()} (No Data) -> Default 1200`);
       nextSeasonConfig[region] = 1200;
     }
  });

  console.log("\n📋 COPY THIS INTO src/lib/elo.ts:");
  console.log("export const STARTING_ELO = " + JSON.stringify(nextSeasonConfig, null, 2) + ";");
}

main();