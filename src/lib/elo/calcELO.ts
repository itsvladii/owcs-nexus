// src/lib/elo.ts

export interface RatedTeam {
  name: string;
  rating: number;
  wins: number;
  losses: number;
  region: string;
  logo?: string;
  logoDark?: string;
  history: { date: string; elo: number }[];
  rankDelta?: number;
  tournaments: string[];
  form: string[]; // i.e ["W", "L", "W", "W", "L"]
  lastResetDate?: string;
  isPartner?: boolean;
  gamesInCurrentRoster: number; //number of games in the current roster
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
  details?: {
    mvp?: string;
    maps: {
      name: string;
      mode: string;
      score: string; // "2-0" or "124.18m"
      winner: string; // "1" or "2"
      bans: string[]; // ["Ana", "Echo"]
    }[];
    debug?: {
      k_a: number;
      k_b: number;
      expected_a: number;
      expected_b: number;
      mov_multiplier: number;
      bully_penalty: boolean;
      is_major: boolean;
      is_regional: boolean;
      games_in_roster_a: number;
      games_in_roster_b: number;
      base_k: number;
    };
  };
}

const INACTIVITY_DAYS = 90; //Teams that do not play an offical OWCS match for more than 90 days are going to be labled as "disbanded"

//Set of OWCS Partner Teams for 2026
const PARTNER_TEAMS_2025 = new Set([
  "Crazy Raccoon",
  "Team Falcons",
  "T1",
  "ZETA DIVISION",
  "Spacestation Gaming",
  "Team Liquid",
  "Disguised",
  "Dallas Fuel",
  "Twisted Minds",
  "Virtus.pro",
  "Team Peps",
  "All Gamers",
  "Weibo Gaming",
  "JD Gaming",
]);

//Alias Map for eventual team rebrandings happening during the season
const TEAM_ALIASES: Record<string, string> = {};

//Regional starting ELO scores (calculated using calcStartELO.ts)
const STARTING_ELO: Record<string, number> = {
  Korea: 1219,
  "North America": 1199,
  EMEA: 1223,
  China: 1195,
  Japan: 1178,
  Pacific: 1162,
  default: 1200,
};

//Record of all the roster resets (i.e the team doesn't keep more than 3 players of the original roster)
const ROSTER_RESETS: { team: string; date: string; resetTo: number }[] = [];

//--- 2. HELPER FUNCTIONS---

//Normalize team names based on the team aliases map (i.e Team CC(Chinese orgless team)-> Team CC)
function getNormalizedTeamName(name: string): string {
  let normalized = name.replace(/\s*\(.*?\)\s*$/, "");

  // Second, check if this name is an alias for another team
  return TEAM_ALIASES[normalized] || normalized;
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

  // Explicitly exclude qualifier/road-to events first, regardless of other keywords.
  if (n.includes("qualifier") || n.includes("last chance")) return false;
  if (n.includes("road to")) return false;
  if (n.includes("group stage")) return false;

  // Match known major event keywords only after exclusions pass
  if (n.includes("champions clash")) return true;
  if (n.includes("midseason championship")) return true;
  if (n.includes("world finals")) return true;
  if (n.includes("ewc") || n.includes("esports world cup")) return true;
  if (n.includes("major")) return true;

  return false;
}

//Helper to check if a non-major match is regional (both teams same region)
function isRegionalMatch(
  regionA: string | null,
  regionB: string | null,
): boolean {
  // If either region is null/unknown, treat as potentially international
  if (!regionA || !regionB) return false;
  return regionA === regionB;
}

/**
 * Determines the K-Factor (Volatility) for a specific match context.
 * Implements the Hierarchy: Major > Calibration > Regional > Bully Penalty.
 */
function getThreePhaseKFactor(
  gamesInCurrentRoster: number,
  isMajor: boolean,
  isRegional: boolean,
  winnerElo: number,
  loserElo: number,
  scoreA: number,
  scoreB: number,
): number {
  // 1. DETERMINE BASELINE
  // Majors start at 50. Regionals start at 20.
  let k = isMajor ? 60 : 20;

  // 2. REGIONAL COMPRESSION
  // If it's a standard regional game, we dampen it slightly (20 -> 15).
  // We skip this if it's a Major or the team is in calibration.
  if (!isMajor && gamesInCurrentRoster >= 6 && isRegional) {
    k = 15;
  }

  // 3. CALIBRATION (The Rocket Fuel)
  // If new team (<6 games), ignore the above and give them high volatility.
  if (gamesInCurrentRoster < 6) {
    k = 50 - (50 - 20) * (gamesInCurrentRoster / 6); // Linear drop 50 -> 20
  }

  // 4. THE BULLY PENALTY (Anti-Farming)
  // If the overwhelming favourite wins, slash the reward.
  if (winnerElo > loserElo + 250) {
    k *= 0.5;
  }

  // 5. THE "STATEMENT WIN"
  // We apply a multiplier based on the Margin of Victory of the winner, rewarding dominant victories
  k *= getMovMultiplier(scoreA, scoreB);

  // 6. SAFETY FLOOR
  // Ensure a match is always worth something
  return Math.max(k, 5);
}

//Function that infers a team's region based on the last game that they've played
//Usefull for treating teams that change region during the OWCS season.
function inferRegion(tournamentName: string): string | null {
  if (tournamentName.includes("Japan") && tournamentName.includes("Pacific"))
    return null;
  if (tournamentName.includes("Pacific")) return "Pacific";
  if (tournamentName.includes("Japan")) return "Japan";
  if (tournamentName.includes("China")) return "China";
  if (tournamentName.includes("Asia")) return null;

  if (tournamentName.includes("Korea") || tournamentName.includes("Asia"))
    return "Korea";
  if (tournamentName.includes("North America") || tournamentName.includes("NA"))
    return "North America";
  if (tournamentName.includes("EMEA") || tournamentName.includes("Europe"))
    return "EMEA";
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

  if (winPercentage >= 0.8) return 1.2; // Dominant
  if (winPercentage >= 0.6) return 1.0; // Solid
  return 0.8; // Close
}

// --- 3. MAIN ALGORITHM ---
export function calculateRankings(
  matches: any[],
  options: {
    isStartSeason?: boolean;
    isCalibration?: boolean;
    /** Pre-seeded team state loaded from the DB (for incremental syncs) */
    initialTeams?: Record<string, RatedTeam>;
  } = { isStartSeason: true },
) {
  // --- A. Check if the algorithm has all the matches at its disposal for the ELO calculations ---
  if (!matches || !Array.isArray(matches)) {
    console.error(
      "[ELO] Error: 'matches' is not an array. Received:",
      typeof matches,
    );
    return {
      rankings: [],
      stats: { biggestMover: null, biggestLoser: null, biggestUpsets: [] },
    };
  }

  // Seed team state from the DB snapshot if doing an incremental sync.
  // Deep-clone to avoid mutating the caller's object.
  const teams: Record<string, RatedTeam> = options.initialTeams
    ? JSON.parse(JSON.stringify(options.initialTeams))
    : {};
  const upsets: any[] = [];
  const processedMatches: ProcessedMatch[] = [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startRatings: Record<string, number> = {};

  // Helper to initialize the team 'structure'.
  // If the team was pre-seeded from the DB it already exists — just return it.
  const getTeam = (name: string, tournament: string) => {
    if (!teams[name]) {
      const region = inferRegion(tournament);
      teams[name] = {
        name,
        region,
        //if we're calculating the base regional elo for the start of the season, default it to 1200
        rating: options.isCalibration
          ? 1200
          : STARTING_ELO[region] || STARTING_ELO["default"],
        wins: 0,
        losses: 0,
        history: [],
        tournaments: [],
        form: [],
        isPartner: PARTNER_TEAMS_2025.has(name),
        gamesInCurrentRoster: 0,
      };
    }
    return teams[name];
  };

  // B. Sort matches chronologically
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // C. Process Matches
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
    if (!winnerId || winnerId === "0") continue;

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

    const matchDateStr = match.date.split(" ")[0];

    // Roster reset check
    [teamA, teamB].forEach((team) => {
      const reset = ROSTER_RESETS.find(
        (r) =>
          r.team === team.name &&
          r.date <= matchDateStr &&
          (!team.lastResetDate || team.lastResetDate < r.date),
      );

      if (reset) {
        team.rating = reset.resetTo;
        team.lastResetDate = reset.date;
        team.gamesInCurrentRoster = 0;
      }
    });

    //Get the raw team data of the match
    const oppA = match.match2opponents[0];
    const oppB = match.match2opponents[1];

    //Verify that the match did not end on a FF
    const forfeitStatuses = ["ff", "dq", "canceled", "forfeit", "w/o"];
    const isForfeitStatus =
      (oppA.status && forfeitStatuses.includes(oppA.status.toLowerCase())) ||
      (oppB.status && forfeitStatuses.includes(oppB.status.toLowerCase()));

    /* C.3 Team Logo URL setter */
    let logoA = oppA.teamtemplate;
    let logoB = oppB.teamtemplate;

    const rawScoreA = oppA.score;
    const rawScoreB = oppB.score;

    const forfeitScores = ["FF", "-1"];
    const isForfeitScore =
      forfeitScores.includes(String(rawScoreA).toUpperCase()) ||
      forfeitScores.includes(String(rawScoreB).toUpperCase());

    if (isForfeitStatus || isForfeitScore) {
      continue;
    }

    if (logoA) {
      if (logoA.imageurl)
        teamA.logo = `https://wsrv.nl/?url=${encodeURIComponent(logoA.imageurl)}&w=200&we`;
      if (logoA.imagedarkurl)
        teamA.logoDark = `https://wsrv.nl/?url=${encodeURIComponent(logoA.imagedarkurl)}&w=200&we`;
    }
    if (logoB) {
      if (logoB.imageurl)
        teamB.logo = `https://wsrv.nl/?url=${encodeURIComponent(logoB.imageurl)}&w=200&we`;
      if (logoB.imagedarkurl)
        teamB.logoDark = `https://wsrv.nl/?url=${encodeURIComponent(logoB.imagedarkurl)}&w=200&we`;
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

    const scoreA_val =
      rawScoreA === -1 || rawScoreA === null ? 0 : Number(rawScoreA);
    const scoreB_val =
      rawScoreB === -1 || rawScoreB === null ? 0 : Number(rawScoreB);

    // Extra safety net just in case Liquipedia throws a weird string we didn't expect
    if (isNaN(scoreA_val) || isNaN(scoreB_val)) continue;

    if (!teamA.tournaments.includes(tournament))
      teamA.tournaments.push(tournament);
    if (!teamB.tournaments.includes(tournament))
      teamB.tournaments.push(tournament);

    // NEW: Check if this is a regional match
    const isMajor = isMajorTournament(tournament);
    const isRegional = isRegionalMatch(teamA.region, teamB.region);

    const teamAWon = scoreA_val > scoreB_val;
    const winnerRating = teamAWon ? teamA.rating : teamB.rating;
    const loserRating = teamAWon ? teamB.rating : teamA.rating;

    //Get the K-Factor for the match
    let kA = getThreePhaseKFactor(
      teamA.gamesInCurrentRoster,
      isMajor,
      isRegional,
      winnerRating,
      loserRating,
      scoreA_val,
      scoreB_val,
    );
    let kB = getThreePhaseKFactor(
      teamB.gamesInCurrentRoster,
      isMajor,
      isRegional,
      winnerRating,
      loserRating,
      scoreA_val,
      scoreB_val,
    );

    // Debug captures — computed before applying to ratings
    const _movMultiplier = getMovMultiplier(scoreA_val, scoreB_val);
    const _bullyPenalty = winnerRating > loserRating + 250 && !isMajor;
    const _baseK = isMajor ? 60 : 20;

    const changeA = kA * (scoreA - expectedA);
    const changeB = kB * (scoreB - expectedB);

    //Apply ELO change to both teams
    teamA.rating += changeA;
    teamB.rating += changeB;

    teamA.gamesInCurrentRoster++;
    teamB.gamesInCurrentRoster++;

    //Push results into teams's "ELO history"
    teamA.history.push({ date: match.date, elo: teamA.rating });
    teamB.history.push({ date: match.date, elo: teamB.rating });

    //Update teams's last 5 games form
    if (scoreA) {
      teamA.wins++;
      teamB.losses++;
      teamA.form.push("W");
      teamB.form.push("L");
    } else {
      teamB.wins++;
      teamA.losses++;
      teamB.form.push("W");
      teamA.form.push("L");
    }

    // EXTRACTION LOGIC
    const mapDetails =
      match.match2games?.map((game: any) => {
        // Extract Bans (Safety check because not all matches have bans)
        const bans = [];
        if (game.extradata?.team1ban1) bans.push(game.extradata.team1ban1);
        if (game.extradata?.team2ban1) bans.push(game.extradata.team2ban1);

        // Format Scores (Handle Push vs Control)
        // Push returns floats like 124.18, Control returns [2, 0]
        let scoreDisplay = "";
        if (game.scores && game.scores.length === 2) {
          if (game.mode === "Push") {
            scoreDisplay = `${Math.round(game.scores[0])}m - ${Math.round(game.scores[1])}m`;
          } else {
            scoreDisplay = `${game.scores[0]} - ${game.scores[1]}`;
          }
        }

        return {
          name: game.map,
          mode: game.mode,
          score: scoreDisplay,
          winner: game.winner,
          bans: bans,
        };
      }) || [];

    // Extract MVP
    const mvpData = match.extradata?.mvp?.players?.["1"]?.displayname || null;

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
      team_b_elo_after: teamB.rating,
      details: {
        mvp: mvpData,
        maps: mapDetails,
        debug: {
          k_a: kA,
          k_b: kB,
          expected_a: expectedA,
          expected_b: expectedB,
          mov_multiplier: _movMultiplier,
          bully_penalty: _bullyPenalty,
          is_major: isMajor,
          is_regional: isRegional,
          games_in_roster_a: teamA.gamesInCurrentRoster,
          games_in_roster_b: teamB.gamesInCurrentRoster,
          base_k: _baseK,
        },
      },
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
        diff: Math.abs(changeA),
      });
    }
  }

  if (options.isStartSeason) {
    return {
      rankings: Object.values(teams).sort((a, b) => b.rating - a.rating),
      processedMatches: processedMatches,
      allTeams: Object.values(teams),
      stats: {
        biggestMover: null,
        biggestLoser: null,
        biggestUpsets: [],
        longestReign: null,
      },
    };
  }

  // --- E. STATISTICS CALCULATIONS ---
  // 1. DAYS AT THE TOP (The "King of the Hill" Stat)
  const daysAtOne: Record<string, number> = {};
  const allDates = new Set<string>();
  Object.values(teams).forEach((t) => {
    t.history.slice(1).forEach((h) => allDates.add(h.date.split(" ")[0]));
  });

  const sortedDates = Array.from(allDates).sort();
  const today = new Date().toISOString().split("T")[0];
  if (sortedDates.length > 0 && sortedDates[sortedDates.length - 1] < today) {
    sortedDates.push(today);
  }

  if (sortedDates.length >= 2) {
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const startDate = sortedDates[i];
      const endDate = sortedDates[i + 1];
      const diffDays = Math.ceil(
        Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      let topTeam = null;
      let maxElo = -1;

      Object.values(teams).forEach((t) => {
        const hasStarted = t.history.some(
          (h) => h.date !== "2026-01-01" && h.date.split(" ")[0] <= startDate,
        );
        if (!hasStarted) return;

        let elo = 1200;
        for (let h = t.history.length - 1; h >= 0; h--) {
          if (t.history[h].date.split(" ")[0] <= startDate) {
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
  }

  const kingName = Object.keys(daysAtOne).reduce(
    (a, b) => (daysAtOne[a] > daysAtOne[b] ? a : b),
    null as string | null,
  );
  const longestReign = kingName
    ? {
        name: kingName,
        days: daysAtOne[kingName],
        logo: teams[kingName]?.logo,
        logoDark: teams[kingName]?.logoDark,
      }
    : null;

  // 2. RANKING DELTA & MOVERS (Weekly Momentum)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const getPastRating = (team: RatedTeam) => {
    const entry = team.history
      .filter((h) => new Date(h.date) <= oneWeekAgo)
      .pop();
    return entry ? entry.elo : STARTING_ELO[team.region] || 1200;
  };

  const allTeamsList = Object.values(teams);
  const oldRankings = [...allTeamsList].sort(
    (a, b) => getPastRating(b) - getPastRating(a),
  );
  const currentRankings = [...allTeamsList].sort((a, b) => b.rating - a.rating);

  const oldRankMap = new Map<string, number>();
  oldRankings.forEach((t, i) => oldRankMap.set(t.name, i + 1));

  currentRankings.forEach((team, index) => {
    const currentRank = index + 1;
    const oldRank = oldRankMap.get(team.name) || currentRank;
    const lastMatchDate = new Date(
      team.history[team.history.length - 1]?.date || "2025-01-01",
    );
    team.rankDelta = lastMatchDate >= oneWeekAgo ? oldRank - currentRank : 0;
  });

  const movers = allTeamsList.map((t) => ({
    name: t.name,
    diff: t.rating - (startRatings[t.name] || t.rating),
    current: t.rating,
    logo: t.logo,
    logoDark: t.logoDark,
  }));

  const biggestMover = movers.sort((a, b) => b.diff - a.diff)[0];
  const biggestLoser = movers.sort((a, b) => a.diff - b.diff)[0];

  // 3. BIGGEST UPSETS (Global Majors only)
  const biggestUpsets = upsets
    .filter((u) => {
      const t = u.tournament.toLowerCase();
      return (
        !t.includes("qualifier") &&
        (t.includes("major") ||
          t.includes("midseason") ||
          t.includes("world") ||
          t.includes("clash"))
      );
    })
    .sort((a, b) => a.prob - b.prob)
    .slice(0, 2);

  // --- F. FINAL RANKING FILTERS ---
  let latestDateInDb =
    matches.length > 0
      ? new Date(
          matches.reduce((l, c) =>
            new Date(c.date) > new Date(l.date) ? c : l,
          ).date,
        )
      : new Date("2025-01-01");

  const cutoffDate = new Date(latestDateInDb);
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);

  const filteredRankings = currentRankings.filter((t: any) => {
    if (t.rating < 1000 || t.wins === 0) return false;
    const lastPlayed = t.history[t.history.length - 1];
    return lastPlayed && new Date(lastPlayed.date) >= cutoffDate;
  });

  filteredRankings.forEach((t) => {
    if (t.form.length > 5) t.form = t.form.slice(-5);
  });

  return {
    rankings: filteredRankings,
    processedMatches: processedMatches,
    allTeams: allTeamsList,
    stats: { biggestMover, biggestLoser, biggestUpsets, longestReign },
  };
}
