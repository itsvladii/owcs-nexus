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
  tournaments: string[];
  lastResetDate?: string;
  isPartner?:boolean
}

// --- CONFIGURATION ---

const MIN_GAMES_PLAYED = 10;

// 3-PHASE PULSE SYSTEM CONSTANTS
const K_CALIBRATION = 50;  // First 10 games: Rocket Fuel
const K_STABILITY = 20;    // Regular Season: Stability
const K_MAJOR = 60;        // Majors/Internationals: The Truth
const SEASONAL_RETENTION = 0.75; // Keep 75% rating on year reset
const STARTING_ELO_BASELINE = 1200; // Baseline for soft resets

//if a team didn't play an official OWCS match for 90 days, they'll be counted as disbanded untill they play a game again
const INACTIVITY_DAYS = 90; 

const PARTNER_TEAMS_2025 = new Set([
  "Crazy Raccoon",
  "Team Falcons",
  "T1",
  "ZETA DIVISION",
  "Spacestation Gaming",
  "Team Liquid",
  "Twisted Minds",
  "Virtus.pro",
  "Gen.G Esports"
]);

// 1. ALIAS MAP (Handles Rebrands)
const TEAM_ALIASES: Record<string, string> = {
  "All Gamers Global": "WAE",
  "WAY": "WAE",
  "Once Again": "Weibo Gaming",
  "Sign Esports": "NTMR",
  "1DIPVS100GORILLAS": "Vanir Quick",
  "Team CC (Chinese orgless team)": "Team CC",
  "Cheeseburger (Korean team)": "Cheeseburger",
  "Quick Esports": "Vanir Quick",
};

// 2. REGIONAL SEEDING
const STARTING_ELO: Record<string, number> = {
  "Korea": 1304,
  "North America": 1264,
  "EMEA": 1255,
  "China": 1200,
  "Japan": 1211,
  "Pacific": 1189,
  "default":1200
};

// 3. TOURNAMENT WEIGHTS (Kept for reference or other uses, but K-factor now uses 3-Phase Logic)
const TOURNAMENT_WEIGHTS: Record<string, number> = {
  'World Finals': 2.5,
  'Midseason': 2.0,
  'Major': 1.5,
  'Stage': 1.0,
  'Qualifier': 0.5,
  'default': 1.0
};

const ROSTER_RESETS: { team: string, date: string, resetTo: number }[] = [
   // NTMR Rebuild after Stage 1 (May 2025)
   { team: "NTMR", date: "2025-05-01", resetTo: 1264 },
];

// --- HELPER FUNCTIONS ---

function getNormalizedTeamName(name: string): string {
  return TEAM_ALIASES[name] || name;
}

function getExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Helper to determine if a tournament is an International Major
function isMajorTournament(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('major') || 
         n.includes('world') || 
         n.includes('midseason') || 
         n.includes('clash') ||
         n.includes('ewc'); 
}

// 3-PHASE K-FACTOR LOGIC
function getThreePhaseKFactor(gamesPlayed: number, isMajor: boolean): number {
  // 1. THE MAJOR (International Correction) - Highest Priority
  if (isMajor) return K_MAJOR;

  // 2. CALIBRATION (Placement Matches) - Fast climbing for new/low-match teams
  if (gamesPlayed < 10) return K_CALIBRATION;

  // 3. STABILITY (Regular Season) - Standard
  return K_STABILITY;
}

// SEASONAL SOFT RESET LOGIC
function applySeasonalSquish(teams: Record<string, RatedTeam>) {
  // console.log("❄️ Applying Seasonal Soft Reset...");
  for (const team of Object.values(teams)) {
    // Pull everyone closer to the 1200 baseline by 25%
    const baseline = STARTING_ELO_BASELINE; 
    const newRating = baseline + (team.rating - baseline) * SEASONAL_RETENTION;
    team.rating = Math.round(newRating);
  }
}

function inferRegion(tournamentName: string): string|null {
  if (tournamentName.includes("Asia")) return null;
  if (tournamentName.includes("Japan") && tournamentName.includes("Pacific")) return null; 
  if (tournamentName.includes("Pacific")) return "Pacific";
  if (tournamentName.includes("Japan")) return "Japan";
  if (tournamentName.includes("China")) return "China";
  
  if (tournamentName.includes("Korea") || tournamentName.includes("Asia")) return "Korea";
  if (tournamentName.includes("North America") || tournamentName.includes("NA")) return "North America";
  if (tournamentName.includes("EMEA") || tournamentName.includes("Europe")) return "EMEA";
  return null;
}

function getMovMultiplier(scoreA: number, scoreB: number): number {
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
  // --- 1. SAFETY CHECK ---
  if (!matches || !Array.isArray(matches)) {
    console.error("[ELO] Error: 'matches' is not an array. Received:", typeof matches);
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
        tournaments: [],
        isPartner: PARTNER_TEAMS_2025.has(name)
      };
    }
    return teams[name];
  };

  // 2. Sort matches chronologically (Oldest -> Newest)
  const sortedMatches = [...matches].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 3. Process Matches
  let currentYear: number | null = null;

  for (const match of sortedMatches) {
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

    const currentRegion = inferRegion(tournament);
    
    if (currentRegion) {
        if (teamA.region !== currentRegion) teamA.region = currentRegion;
        if (teamB.region !== currentRegion) teamB.region = currentRegion;
    }

    const matchDateStr = match.date.split(' ')[0]; // Get YYYY-MM-DD

    // --- NEW: SEASONAL RESET CHECK ---
    const matchYear = new Date(match.date).getFullYear();
    if (currentYear !== null && matchYear > currentYear) {
       applySeasonalSquish(teams);
    }
    currentYear = matchYear;
    // --------------------------------

    
    [teamA, teamB].forEach(team => {
        const reset = ROSTER_RESETS.find(r => 
            r.team === team.name && 
            r.date <= matchDateStr && 
            (!team.lastResetDate || team.lastResetDate < r.date)
        );

        if (reset) { 
            team.rating = reset.resetTo; 
            team.lastResetDate = reset.date; 
        }
    });

    let logoA = match.match2opponents[0].teamtemplate
    let logoB = match.match2opponents[1].teamtemplate

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

    // --- NEW: 3-PHASE K-FACTOR LOGIC ---
    const isMajor = isMajorTournament(tournament);
    const gamesA = teamA.wins + teamA.losses;
    const gamesB = teamB.wins + teamB.losses;

    let kA = getThreePhaseKFactor(gamesA, isMajor);
    let kB = getThreePhaseKFactor(gamesB, isMajor);

    // Apply MoV Multiplier to both (Keeping your bonus logic)
    const movMultiplier = getMovMultiplier(scoreA_val, scoreB_val);
    kA *= movMultiplier;
    kB *= movMultiplier;
    
    // Define base K for the existing LAN protection check
    // We use the Major K if it's a major, otherwise we check games played for a generic 'k'
    let k = isMajor ? K_MAJOR : (gamesA < 10 ? K_CALIBRATION : K_STABILITY);
    // -----------------------------------

    // --- LAN PROTECTION (Preserved) ---
    const isBigTournament = k >= 40; 

    if (isBigTournament) {
        // If Team A lost, halve their K-factor (Half penalty)
        if (scoreA === 0) kA = kA * 0.5;
        
        // If Team B lost, halve their K-factor
        if (scoreB === 0) kB = kB * 0.5;
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
        winnerLogo: winnerTeam.logo,          
        winnerLogoDark: winnerTeam.logoDark, 
        loser: loserTeam.name,
        loserLogo: loserTeam.logo,            
        loserLogoDark: loserTeam.logoDark,    
        prob: probability,
        date: match.date,
        tournament: match.tournament,
        diff: Math.abs(changeA)
      });
    }
  }

  // --- REST OF STATS CALCULATION (UNCHANGED) ---

  const daysAtOne: Record<string, number> = {};
  const allDates = new Set<string>();
  
  Object.values(teams).forEach(t => t.history.forEach(h => allDates.add(h.date.split(' ')[0])));
  const sortedDates = Array.from(allDates).sort();
  
  const today = new Date().toISOString().split('T')[0];
  if (sortedDates[sortedDates.length - 1] < today) sortedDates.push(today);

  for (let i = 0; i < sortedDates.length - 1; i++) {
      const startDate = sortedDates[i];
      const endDate = sortedDates[i+1];
      const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      let topTeam = null;
      let maxElo = -1;

      Object.values(teams).forEach(t => {
          let elo = STARTING_ELO[t.region] || 1200;
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

      if (topTeam) {
          daysAtOne[topTeam] = (daysAtOne[topTeam] || 0) + diffDays;
      }
  }
  
  const kingName = Object.keys(daysAtOne).reduce((a, b) => daysAtOne[a] > daysAtOne[b] ? a : b, null as string | null);
  const longestReign = kingName ? { name: kingName, days: daysAtOne[kingName] } : null;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const getPastRating = (team: RatedTeam) => {
    const entry = team.history.filter(h => new Date(h.date) <= oneWeekAgo).pop();
    return entry ? entry.elo : (STARTING_ELO[team.region] || 1200);
  };

  const allTeams = Object.values(teams);
  const oldRankings = [...allTeams].sort((a, b) => getPastRating(b) - getPastRating(a));
  const currentRankings = [...allTeams].sort((a, b) => b.rating - a.rating);

  const oldRankMap = new Map<string, number>();
  oldRankings.forEach((t, i) => oldRankMap.set(t.name, i + 1));

  currentRankings.forEach((team, index) => {
    const currentRank = index + 1;
    const oldRank = oldRankMap.get(team.name) || currentRank;
    team.rankDelta = oldRank - currentRank;
  });

  const movers = Object.values(teams).map(t => {
    const start = startRatings[t.name] || t.rating;
    return {
      name: t.name,
      diff: t.rating - start,
      current: t.rating,
      logo: t.logo,         
      logoDark: t.logoDark  
    };
  });

  const biggestMover = movers.sort((a, b) => b.diff - a.diff)[0];
  const biggestLoser = movers.sort((a, b) => a.diff - b.diff)[0];
  
  const biggestUpsets = upsets.filter(u => {
        const t = u.tournament.toLowerCase();
       if (t.includes("qualifier")) return false;
       const isGlobal = t.includes("major") || 
                        t.includes("midseason") || 
                        t.includes("world") || 
                        t.includes("clash"); 
       return isGlobal;
    })
    .slice(0,2)
    .sort((a: any, b: any) => a.prob - b.prob);

  let latestDateInDb = new Date('2025-01-01');
  if (matches.length > 0) {
      const lastMatch = matches.reduce((latest, current) => new Date(current.date) > new Date(latest.date) ? current : latest);
      latestDateInDb = new Date(lastMatch.date);
  }
  
  const cutoffDate = new Date(latestDateInDb);
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);

  const filteredRankings = currentRankings.filter((t: any) => {
       if ((t.wins + t.losses) < MIN_GAMES_PLAYED) return false;
       if (t.rating < 1000 || t.wins === 0) return false;
       const lastPlayedEntry = t.history[t.history.length - 1];
       if (!lastPlayedEntry) return false;
       if (new Date(lastPlayedEntry.date) < cutoffDate) return false;

       return true;
  });

  return {
    rankings: filteredRankings,
    stats: {
      biggestMover,
      biggestLoser,
      biggestUpsets,
      longestReign
    }
  };
}