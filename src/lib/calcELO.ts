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
  rankDelta?: number;
  tournaments: string[]
}

// --- CONFIGURATION ---

const MIN_GAMES_PLAYED = 5;
const K_FACTOR_BASE = 20;

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

function getMovMultiplier(scoreA: number, scoreB: number): number {
  // Handle missing scores or draws (should be filtered out, but safety first)
  if (scoreA === undefined || scoreB === undefined) return 1.0;
  
  const diff = Math.abs(scoreA - scoreB);

  // Map Difference Logic:
  // 3+ Map Diff (3-0, 4-0, 4-1) -> Dominant Win -> 1.2x
  // 2 Map Diff (3-1, 4-2)       -> Solid Win    -> 1.0x
  // 1 Map Diff (3-2, 4-3)       -> Close Win    -> 0.8x
  
  if (diff >= 3) return 1.2;
  if (diff === 2) return 1.0;
  return 0.8;
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
        history: [{ date: '2025-01-01', elo: STARTING_ELO[region] || 1200 }], // Start point
        tournaments: []
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

    const rawScoreA = match.match2opponents[0].score;
    const rawScoreB = match.match2opponents[1].score;
    
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

    const scoreA_val = (rawScoreA === -1 || rawScoreA === null) ? 0 : Number(rawScoreA);
    const scoreB_val = (rawScoreB === -1 || rawScoreB === null) ? 0 : Number(rawScoreB);

    if (!teamA.tournaments.includes(tournament)) teamA.tournaments.push(tournament);
    if (!teamB.tournaments.includes(tournament)) teamB.tournaments.push(tournament);

    let k = getKFactor(tournament);
    // APPLY MoV MULTIPLIER
    // We multiply the tournament weight by the performance weight
    const movMultiplier = getMovMultiplier(scoreA_val, scoreB_val);
    k = k * movMultiplier;
  // --- NEW: LAN PROTECTION (The Fix) ---
    // If this is a high-stakes tournament (K > 40 means Major/Worlds),
    // we protect the loser so they don't tank their rating just for qualifying.
    let kA = k;
    let kB = k;

    const isBigTournament = k >= 40; 

    if (isBigTournament) {
        // If Team A lost, halve their K-factor (Half penalty)
        if (scoreA === 0) kA = k * 0.5;
        
        // If Team B lost, halve their K-factor
        if (scoreB === 0) kB = k * 0.5;
    }
    // -------------------------------------

    // Calculate Points Change (Using individual K values)
    const changeA = kA * (scoreA - expectedA);
    const changeB = kB * (scoreB - expectedB);

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


  const daysAtOne: Record<string, number> = {};
  const allDates = new Set<string>();
  
  // A. Collect all dates where ELO changed
  Object.values(teams).forEach(t => t.history.forEach(h => allDates.add(h.date.split(' ')[0])));
  const sortedDates = Array.from(allDates).sort();
  
  // B. Add "Today" to close the loop (so the current #1 gets credit until today)
  const today = new Date().toISOString().split('T')[0];
  if (sortedDates[sortedDates.length - 1] < today) sortedDates.push(today);

  // C. Replay History Day-by-Day
  for (let i = 0; i < sortedDates.length - 1; i++) {
      const startDate = sortedDates[i];
      const endDate = sortedDates[i+1];
      
      // How many days in this window?
      const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      // Find who was #1 on 'startDate'
      let topTeam = null;
      let maxElo = -1;

      Object.values(teams).forEach(t => {
          // Find the team's rating as of 'startDate'
          let elo = STARTING_ELO[t.region] || 1200;
          // Look backwards in history for the latest entry before/on this date
          for (let h = t.history.length - 1; h >= 0; h--) {
              if (t.history[h].date.split(' ')[0] <= startDate) {
                  elo = t.history[h].elo;
                  break;
              }
          }
          if (elo > maxElo) {
              maxElo = elo;
              topTeam = t.name;
          }
      });

      // Give credit to the King
      if (topTeam) {
          daysAtOne[topTeam] = (daysAtOne[topTeam] || 0) + diffDays;
      }
  }
  
  // D. Find the Winner
  const kingName = Object.keys(daysAtOne).reduce((a, b) => daysAtOne[a] > daysAtOne[b] ? a : b, null as string | null);
  const longestReign = kingName ? { name: kingName, days: daysAtOne[kingName] } : null;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // 2. Helper to get a team's rating at a specific past date
  const getPastRating = (team: RatedTeam) => {
    // Find the last history entry before or on the snapshot date
    const entry = team.history.filter(h => new Date(h.date) <= oneWeekAgo).pop();
    // If no history existed then, use their starting/reset rating
    return entry ? entry.elo : (STARTING_ELO[team.region] || 1200);
  };

  // 3. Sort the list as it would have been 7 days ago
  // We use the full list of teams calculated in the main loop
  const allTeams = Object.values(teams);
  
  const oldRankings = [...allTeams].sort((a, b) => getPastRating(b) - getPastRating(a));
  const currentRankings = [...allTeams].sort((a, b) => b.rating - a.rating);

  // 4. Compare Ranks
  // Create a map for fast lookup: "Team Name" -> "Old Rank"
  const oldRankMap = new Map<string, number>();
  oldRankings.forEach((t, i) => oldRankMap.set(t.name, i + 1));

  currentRankings.forEach((team, index) => {
    const currentRank = index + 1;
    const oldRank = oldRankMap.get(team.name) || currentRank; // If new, assume no change
    
    // Calculate Delta: (Old - New). 
    // Example: Was #5, Now #3. Delta = 5 - 3 = +2 (Moved UP)
    team.rankDelta = oldRank - currentRank;
  });

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
      .filter(t=> t.wins>0)
      .sort((a, b) => b.rating - a.rating),
    stats: {
      biggestMover,
      biggestLoser,
      biggestUpsets,
      longestReign
    }
  };
}