// src/lib/elo.ts

export interface RatedTeam {
  name: string;
  rating: number;
  wins: number;
  losses: number;
  region: string;
  logo?: string;
  logoDark?: string;
  history: { date: string, elo: number }[];
}

// --- CONFIGURATION ---

const MIN_GAMES_PLAYED = 5;
const K_FACTOR_BASE = 32;

// 1. ALIAS MAP (Handles Rebrands)
const TEAM_ALIASES: Record<string, string> = {
  "All Gamers Global": "WAE",
  "WAY": "WAE",
  "Once Again": "Weibo Gaming",
  "Sign Esports": "NTMR",
  "1DIPVS100GORILLAS": "Quick Esports",
  "Team CC (Chinese orgless team)": "Team CC",
  "Cheeseburger (Korean team)": "Cheeseburger"
};

// 2. REGIONAL SEEDING
const STARTING_ELO: Record<string, number> = {
  'Korea': 1350,
  'EMEA': 1250,
  'North America': 1250,
  'Japan': 1150,
  'Pacific': 1100,
  'China': 1200,
  'default': 1200
};

// 3. TOURNAMENT WEIGHTS
const TOURNAMENT_WEIGHTS: Record<string, number> = {
  'World Finals': 2.5,
  'Midseason': 2.0,
  'Major': 1.5,
  'Stage': 1.0,
  'Qualifier': 0.5,
  'default': 1.0
};

// --- HELPER FUNCTIONS ---

function getNormalizedTeamName(name: string): string {
  return TEAM_ALIASES[name] || name;
}

function getExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function getKFactor(tournamentName: string): number {
  const key = Object.keys(TOURNAMENT_WEIGHTS).find(k => tournamentName.includes(k));
  return (key ? TOURNAMENT_WEIGHTS[key] : TOURNAMENT_WEIGHTS['default']) * K_FACTOR_BASE;
}

function inferRegion(tournamentName: string): string {
  if (tournamentName.includes("Korea") || tournamentName.includes("Asia")) return "Korea";
  if (tournamentName.includes("North America") || tournamentName.includes("NA")) return "North America";
  if (tournamentName.includes("EMEA") || tournamentName.includes("Europe")) return "EMEA";
  if (tournamentName.includes("Japan")) return "Japan";
  if (tournamentName.includes("Pacific")) return "Pacific";
  if (tournamentName.includes("China")) return "China";
  return "default";
}

// --- MAIN ALGORITHM ---

export function calculateRankings(matches: any[]) {
  // --- 1. SAFETY CHECK (THE FIX) ---
  // If matches is undefined, null, or not an array, stop immediately.
  if (!matches || !Array.isArray(matches)) {
    console.error("[ELO] Error: 'matches' is not an array. Received:", typeof matches);
    // Return empty structure so the page doesn't crash
    return { 
      rankings: [], 
      stats: { biggestMover: null, biggestLoser: null, biggestUpsets: [] } 
    };
  }

  const teams: Record<string, RatedTeam> = {};
  const upsets: any[] = [];
  
  // Track ratings from ~30 days ago for "Movers" calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startRatings: Record<string, number> = {};

  // Helper to initialize team
  const getTeam = (name: string, tournament: string) => {
    if (!teams[name]) {
      const region = inferRegion(tournament);
      teams[name] = {
        name,
        region,
        rating: STARTING_ELO[region] || STARTING_ELO['default'],
        wins: 0,
        losses: 0,
        history: [{ date: '2025-01-01', elo: STARTING_ELO[region] || 1200 }] // Start point
      };
    }
    return teams[name];
  };

  // 2. Sort matches chronologically (Oldest -> Newest)
  // Now safe because we know 'matches' is an array
  const sortedMatches = [...matches].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 3. Process Matches
  for (const match of sortedMatches) {
    // ... (Keep your existing match processing loop exactly the same) ...
    // Validate Data
    if (!match.match2opponents || match.match2opponents.length < 2) continue;

    const rawNameA = match.match2opponents[0].name;
    const rawNameB = match.match2opponents[1].name;

    if (!rawNameA || !rawNameB) continue;

    const nameA = getNormalizedTeamName(rawNameA);
    const nameB = getNormalizedTeamName(rawNameB);
    const winnerId = match.winner; 
    const tournament = match.tournament; 

    if (!winnerId || winnerId === '0') continue;

    const teamA = getTeam(nameA, tournament);
    const teamB = getTeam(nameB, tournament);

    let logoA=match.match2opponents[0].teamtemplate
    let logoB=match.match2opponents[1].teamtemplate
    
    if (logoA) {
      if(logoA.imageurl)
        teamA.logo = `https://wsrv.nl/?url=${encodeURIComponent(logoA.imageurl)}`;
      if(logoA.imagedarkurl)
        teamA.logoDark = `https://wsrv.nl/?url=${encodeURIComponent(logoA.imagedarkurl)}`;
    }
    if (logoB) {
      if(logoB.imageurl)
        teamB.logo = `https://wsrv.nl/?url=${encodeURIComponent(logoB.imageurl)}`;
      if(logoA.imagedarkurl)
        teamB.logoDark = `https://wsrv.nl/?url=${encodeURIComponent(logoB.imagedarkurl)}`;
    }

    const matchDate = new Date(match.date);
    if (matchDate >= thirtyDaysAgo) {
      if (!startRatings[nameA]) startRatings[nameA] = teamA.rating;
      if (!startRatings[nameB]) startRatings[nameB] = teamB.rating;
    }

    const expectedA = getExpectedScore(teamA.rating, teamB.rating);
    const expectedB = getExpectedScore(teamB.rating, teamA.rating);
    
    const scoreA = winnerId === "1" ? 1 : 0;
    const scoreB = winnerId === "2" ? 1 : 0;

    const k = getKFactor(tournament);
    
    const changeA = k * (scoreA - expectedA);
    const changeB = k * (scoreB - expectedB);

    teamA.rating += changeA;
    teamB.rating += changeB;

    teamA.history.push({ date: match.date, elo: teamA.rating });
    teamB.history.push({ date: match.date, elo: teamB.rating });

    if (scoreA) { teamA.wins++; teamB.losses++; }
    else { teamB.wins++; teamA.losses++; }

    const probability = scoreA ? expectedA : expectedB;
    if (probability < 0.35) {
      const winnerTeam = scoreA ? teamA : teamB;
      const loserTeam = scoreA ? teamB : teamA;
      
      upsets.push({
        winner: winnerTeam.name,
        winnerLogo: winnerTeam.logo,          // <--- Pass logo
        winnerLogoDark: winnerTeam.logoDark,  // <--- Pass dark logo
        loser: loserTeam.name,
        loserLogo: loserTeam.logo,            // <--- Pass logo
        loserLogoDark: loserTeam.logoDark,    // <--- Pass dark logo
        prob: probability,
        date: match.date,
        tournament: match.tournament,
        diff: Math.abs(changeA)
      });
    }
  }

  // --- CALCULATE MOVERS (UPDATED TO INCLUDE LOGOS) ---
  const movers = Object.values(teams).map(t => {
    const start = startRatings[t.name] || t.rating;
    return {
      name: t.name,
      diff: t.rating - start,
      current: t.rating,
      logo: t.logo,         // <--- Pass logo
      logoDark: t.logoDark  // <--- Pass dark logo
    };
  });

  const biggestMover = movers.sort((a, b) => b.diff - a.diff)[0];
  const biggestLoser = movers.sort((a, b) => a.diff - b.diff)[0];
  
  const biggestUpsets = upsets.sort((a, b) => a.prob - b.prob).slice(0, 2);

  // 5. Return Results
  return {
    rankings: Object.values(teams)
      .filter(t => (t.wins + t.losses) >= MIN_GAMES_PLAYED)
      .filter(t => t.rating >= 1000)
      .sort((a, b) => b.rating - a.rating),
    stats: {
      biggestMover,
      biggestLoser,
      biggestUpsets
    }
  };
}