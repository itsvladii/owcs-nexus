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
  form: string[]; // i.e ["W", "L", "W", "W", "L"]
  lastResetDate?: string;
  isPartner?:boolean
}

export interface ProcessedMatch {
  id: string;
  date: string;
  tournament: string;
  team_a: string;
  team_b: string;
  score_a: number;
  score_b: number;
  winner_id: string;
  elo_change_a: number;
  elo_change_b: number;
  team_a_elo_after: number;
  team_b_elo_after: number;
}

// --- 1. CONFIGURATION & CONSTANTS ---
const K_CALIBRATION = 50;  // First 10 games: Rocket Fuel
const K_STABILITY = 20;    // Regular Season: Stability
const K_MAJOR = 60;        // Majors/Internationals: The Truth
const K_REGIONAL_COMPRESSION = 0.65; // Regional matches worth 65% after calibration
const K_BULLY_PENALTY = 0.5; // 50% reduction for farming weak teams

const SEASONAL_RETENTION = 0.70; // Keep 70% rating on year reset
const STARTING_ELO_BASELINE = 1200; // Baseline for soft resets

const INACTIVITY_DAYS = 90; //Teams that do not play an offical OWCS match for more than 90 days are going to be labled as "disbanded"

//Set of OWCS Partner Teams for 2026
const PARTNER_TEAMS_2025 = new Set([
  "Crazy Raccoon",
  "Team Falcons",
  "T1",
  "ZETA DIVISION",
  "Spacestation Gaming",
  "Team Liquid",
  "Twisted Minds",
  "Virtus.pro",
  "Disguised",
  "Dallas Fuel"
]);

//Alias Map for eventual team rebrandings happening during the season
const TEAM_ALIASES: Record<string, string> = {
  "All Gamers Global": "WAE",
  "WAY": "WAE",
  "Once Again": "Weibo Gaming",
  "Sign Esports": "NTMR",
  "1DIPVS100GORILLAS": "Vanir Quick",
  "Team CC (Chinese orgless team)": "Team CC",
  "Cheeseburger (Korean team)": "Cheeseburger",
  "Quick Esports": "Vanir Quick",
  "VortexWolf":"REJECT"
};

//Regional starting ELO scores
const STARTING_ELO: Record<string, number> = {
  "Korea": 1304,
  "North America": 1264,
  "EMEA": 1255,
  "China": 1200,
  "Japan": 1211,
  "Pacific": 1189,
  "default":1200
};

//Record of all the roster resets (i.e the team doesn't keep more than 2 players of the original roster)
const ROSTER_RESETS: { team: string, date: string, resetTo: number }[] = [
   { team: "NTMR", date: "2025-05-01", resetTo: 1264 },
];

//--- 2. HELPER FUNCTIONS---

//Normalize team names based on the team aliases map (i.e Team CC(Chinese orgless team)-> Team CC)
function getNormalizedTeamName(name: string): string {
  return TEAM_ALIASES[name] || name;
}

/**
 * Calculates Win Probability (Expected Score) using Logistic Distribution.
 * Returns a value between 0.0 (0%) and 1.0 (100%).
 */
function getExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Helper to determine if a tournament is an International Major
function isMajorTournament(name: string): boolean {
  const n = name.toLowerCase();
  
  // 1. Explicit Major Keywords
  if (n.includes('major') || n.includes('world') || n.includes('clash')) return true;
  
  // 2. Specific Big Events (Midseason, EWC)
  if (n.includes('midseason') || n.includes('ewc') || n.includes('esports world cup')) return true;

  return false;
}

//Helper to check if a non-major match is regional (both teams same region)
function isRegionalMatch(regionA: string | null, regionB: string | null): boolean {
  // If either region is null/unknown, treat as potentially international
  if (!regionA || !regionB) return false;
  return regionA === regionB;
}

/**
 * Determines the K-Factor (Volatility) for a specific match context.
 * Implements the Hierarchy: Major > Calibration > Regional > Bully Penalty.
 */
function getThreePhaseKFactor(
  gamesPlayed: number,
  isMajor: boolean,
  isRegional: boolean,
  winnerRating: number,
  loserRating: number
): number {
  // ---------------------------------------------------------
  // PRIORITY 1: THE MAJOR OVERRIDE
  // ---------------------------------------------------------
  // Check if the match is a major. If true, set the maximum K-factor value of 60.
  if (isMajor) return K_MAJOR;

  // ---------------------------------------------------------
  // PRIORITY 2: CALIBRATION (for new teams)
  // ---------------------------------------------------------
  if (gamesPlayed < 10) {
    // Linear slide from 50 -> 20
    return K_CALIBRATION - ((K_CALIBRATION - K_STABILITY) * (gamesPlayed / 10));
  }

  // ---------------------------------------------------------
  // PRIORITY 3: ESTABLISHING THE REGIONAL BASELINE
  // ---------------------------------------------------------
  // Apply Regional Compression first (Regional games are less informative than international ones)

  let k = K_STABILITY; // Start at Standard (20)
  if (isRegional) {
    k *= K_REGIONAL_COMPRESSION; // 20 * 0.65 = 13
  }

  // ---------------------------------------------------------
  // PRIORITY 4: THE "BULLY PENALTY" (Directional)
  // ---------------------------------------------------------
  // If the favorite wins against a much weaker team, reduce reward. Otherwise if the underdog won, no changes on the rewards.
  if (winnerRating > loserRating) {
    const eloDiff = winnerRating - loserRating;

    // If the gap is massive (>250 ELO), slash the reward.
    if (eloDiff > 250) {
      k *= K_BULLY_PENALTY; // 13 * 0.5 = 6.5 (or 20 * 0.5 = 10)
    }
  }
  return k;
}

//Seasonal Soft Reset Helper
function applySeasonalSquish(teams: Record<string, RatedTeam>) {
  for (const team of Object.values(teams)) {
    const baseline = STARTING_ELO_BASELINE; 
    const newRating = baseline + (team.rating - baseline) * SEASONAL_RETENTION;
    team.rating = Math.round(newRating);
  }
}

//Function that infers a team's region based on the last game that they've played
//Usefull for treating teams that change region during the OWCS season.
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

// Helper that calculates the "margin" of victory of a match:
function getMovMultiplier(scoreA: number, scoreB: number): number {
  if (scoreA === undefined || scoreB === undefined) return 1.0;
  
  const totalMaps = scoreA + scoreB;
  const diff = Math.abs(scoreA - scoreB);
  
  // Edge case: Avoid division by zero
  if (totalMaps === 0) return 1.0;
  
  // Calculate winner's map win percentage in the match
  const winnerScore = Math.max(scoreA, scoreB);
  const winPercentage = winnerScore / totalMaps;
  
  // Thresholds:
  // 80%+   = Dominant (e.g., 4-1 in Bo7, 3-0 in Bo5)  -> 1.2×
  // 60-80% = Solid   (e.g., 3-1 in Bo5, 4-2 in Bo7)   -> 1.0×
  // <60%   = Close   (e.g., 3-2 in Bo5, 4-3 in Bo7)   -> 0.8×
  
  if (winPercentage >= 0.80) return 1.2;  // Dominant
  if (winPercentage >= 0.60) return 1.0;  // Solid
  return 0.8;                              // Close
}

// --- 3. MAIN ALGORITHM ---
export function calculateRankings(matches: any[]) {
  // --- A. Check if the algorithm has all the matches at its disposal for the ELO calculations ---
  if (!matches || !Array.isArray(matches)) {
    console.error("[ELO] Error: 'matches' is not an array. Received:", typeof matches);
    return { 
      rankings: [], 
      stats: { biggestMover: null, biggestLoser: null, biggestUpsets: [] } 
    };
  }

  const teams: Record<string, RatedTeam> = {};
  const upsets: any[] = [];
  const processedMatches: ProcessedMatch[] = [];
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startRatings: Record<string, number> = {};

  // Helper to initialize the team 'structure'
  const getTeam = (name: string, tournament: string) => {
    if (!teams[name]) {
      const region = inferRegion(tournament);
      teams[name] = {
        name,
        region,
        rating: STARTING_ELO[region] || STARTING_ELO['default'],
        wins: 0,
        losses: 0,
        history: [{ date: '2025-01-01', elo: STARTING_ELO[region] || 1200 }],
        tournaments: [],
        form:[],
        isPartner: PARTNER_TEAMS_2025.has(name)
      };
    }
    return teams[name];
  };

  // B. Sort matches chronologically
  const sortedMatches = [...matches].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // C. Process Matches
  let currentYear: number | null = null;

  for (const match of sortedMatches) {

    /* C.1 Save Team Data */
    //If a match has no teams, skip
    if (!match.match2opponents || match.match2opponents.length < 2) continue;

    //Save the raw names of the teams
    const rawNameA = match.match2opponents[0].name;
    const rawNameB = match.match2opponents[1].name;
    if (!rawNameA || !rawNameB) continue;

    //Normalize the names of the teams
    const nameA = getNormalizedTeamName(rawNameA);
    const nameB = getNormalizedTeamName(rawNameB);

    /* C.2 Save Match/Tournament Data */
    //Get the winner of the match and the tournament
    const winnerId = match.winner; 
    const tournament = match.tournament; 

    //If there's no winner, skip the match
    if (!winnerId || winnerId === '0') continue;

    //Save team data in the "team" structure
    const teamA = getTeam(nameA, tournament);
    const teamB = getTeam(nameB, tournament);
    //Infer OWCS region of the tournament
    const currentRegion = inferRegion(tournament);
    
    //set team's region based on the tournament match they played
    if (currentRegion) {
        if (teamA.region !== currentRegion) teamA.region = currentRegion;
        if (teamB.region !== currentRegion) teamB.region = currentRegion;
    }

    const matchDateStr = match.date.split(' ')[0];

    // Seasonal reset check
    const matchYear = new Date(match.date).getFullYear();
    if (currentYear !== null && matchYear > currentYear) {
       applySeasonalSquish(teams);
    }
    currentYear = matchYear;

    // Roster reset check
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

    /* C.3 Team Logo URL setter */
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
      if(logoB.imagedarkurl)
        teamB.logoDark = `https://wsrv.nl/?url=${encodeURIComponent(logoB.imagedarkurl)}`;
    }

    const matchDate = new Date(match.date);
    if (matchDate >= thirtyDaysAgo) {
      if (!startRatings[nameA]) startRatings[nameA] = teamA.rating;
      if (!startRatings[nameB]) startRatings[nameB] = teamB.rating;
    }

    /* C.4 Get Match Data */

    //Get expected scores of both teams
    const expectedA = getExpectedScore(teamA.rating, teamB.rating);
    const expectedB = getExpectedScore(teamB.rating, teamA.rating);
    
    //Assign scores and winner of the match to the respective teams
    const scoreA = winnerId === "1" ? 1 : 0;
    const scoreB = winnerId === "2" ? 1 : 0;

    const scoreA_val = (rawScoreA === -1 || rawScoreA === null) ? 0 : Number(rawScoreA);
    const scoreB_val = (rawScoreB === -1 || rawScoreB === null) ? 0 : Number(rawScoreB);

    if (!teamA.tournaments.includes(tournament)) teamA.tournaments.push(tournament);
    if (!teamB.tournaments.includes(tournament)) teamB.tournaments.push(tournament);

    // NEW: Check if this is a regional match
    const isMajor = isMajorTournament(tournament);
    const isRegional = isRegionalMatch(teamA.region, teamB.region);

    const teamAWon = match.score_a > match.score_b;
    const winnerRating = teamAWon ? teamA.rating : teamB.rating;
    const loserRating = teamAWon ? teamB.rating : teamA.rating;
    
    const gamesA = teamA.wins + teamA.losses;
    const gamesB = teamB.wins + teamB.losses;

    //Get the K-Factor for the match
    let kA = getThreePhaseKFactor(gamesA ,isMajor, isRegional, winnerRating, loserRating);
    let kB = getThreePhaseKFactor(gamesB ,isMajor, isRegional, winnerRating, loserRating);

    //Apply MoV (margin-of-victory) Multiplier
    const movMultiplier = getMovMultiplier(scoreA_val, scoreB_val);
    kA *= movMultiplier;
    kB *= movMultiplier;

    //Calculate Points Change
    const changeA = kA * (scoreA - expectedA);
    const changeB = kB * (scoreB - expectedB);

    //Apply ELO change to both teams
    teamA.rating += changeA;
    teamB.rating += changeB;

    //Push results into teams's "ELO history"
    teamA.history.push({ date: match.date, elo: teamA.rating });
    teamB.history.push({ date: match.date, elo: teamB.rating });

    //Update teams's last 5 games form
    if (scoreA) { 
        teamA.wins++; 
        teamB.losses++; 
        teamA.form.push('W');
        teamB.form.push('L');
    } else { 
        teamB.wins++; 
        teamA.losses++; 
        teamB.form.push('W');
        teamA.form.push('L');
    }

    //Add the processed match
    processedMatches.push({
      id: match.id || `${matchDateStr}-${nameA}-${nameB}`,
      date: match.date,
      tournament: tournament,
      team_a: teamA.name,
      team_b: teamB.name,
      score_a: scoreA_val,
      score_b: scoreB_val,
      winner_id: winnerId,
      elo_change_a: changeA,
      elo_change_b: changeB,
      team_a_elo_after: teamA.rating,
      team_b_elo_after: teamB.rating
    });

    //If the match was an upset, add it also into a separate "upsets" structure
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

  // --- STATS CALCULATION ---
  // DAYS AT THE TOP CALCULATOR
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

  //BIGGEST MOVERS CALCULATOR
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
  
  //BIGGEST UPSETS CALCULATOR
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

  //RANKING FILTERS
  //Teams that have at least 1 win and have more than 1000 ELO points are displayed
  //Teams that did not play for more than 90 days are not displayed
  const filteredRankings = currentRankings.filter((t: any) => {
       if (t.rating < 1000 || t.wins === 0) return false;
       const lastPlayedEntry = t.history[t.history.length - 1];
       if (!lastPlayedEntry) return false;
       if (new Date(lastPlayedEntry.date) < cutoffDate) return false;
       return true;
  });

  filteredRankings.forEach(t => {
      if (t.form.length > 5) {
          t.form = t.form.slice(-5); 
      }
  });

  //Return all the filtered rankings
  return {
    rankings: filteredRankings,
    processedMatches: processedMatches,
    allTeams: Object.values(teams),
    stats: {
      biggestMover,
      biggestLoser,
      biggestUpsets,
      longestReign
    }
  };
}