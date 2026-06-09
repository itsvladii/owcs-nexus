// =============================================================================
// calcELO.ts — Streamlined ELO Ranking System for OWCS Nexus
// =============================================================================
//
// Core ELO with four OWCS-specific additions:
//   1. Three-tier K-factor (Major / Cross-region / Regional)
//   2. Smooth calibration curve for new/reset rosters
//   3. MoV modifier on winner's K only
//   4. Jaccard roster fingerprinting → auto soft-reset on overhaul
//   5. Gradual inactivity decay (post-loop, floor at 70%)
//
// No bully penalty. No isStartSeason flag. No manual ROSTER_RESETS array.
// =============================================================================

// --- 1. TYPES ---

export interface RatedTeam {
  name: string;
  rating: number;
  wins: number;
  losses: number;
  region: string | null;
  logo?: string;
  logoDark?: string;
  history: { date: string; elo: number }[];
  form: ("W" | "L")[];
  tournaments: string[];
  isPartner: boolean;
  rankDelta?: number;
  // Roster continuity
  gamesInCurrentRoster: number;
  lastResetDate?: string;
  rosterFingerprint: string[];
  // Inactivity
  lastMatchDate?: string;
  inactivityDecay: number; // 1.0 = fresh, 0.70 = floor
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
  is_major: boolean;
  is_regional: boolean;
  elo_change_a: number;
  elo_change_b: number;
  team_a_elo_after: number;
  team_b_elo_after: number;
  details?: {
    mvp?: string;
    maps: {
      name: string;
      mode: string;
      score: string;
      winner: string;
      bans: string[];
    }[];
    debug?: {
      k_a: number;
      k_b: number;
      base_k: number;
      expected_a: number;
      expected_b: number;
      mov_multiplier: number;
      games_in_roster_a: number;
      games_in_roster_b: number;
      is_major: boolean;
      is_regional: boolean;
    };
  };
}

// --- 2. CONSTANTS ---

// Regional starting ELO — output of calcStartELO.ts
const STARTING_ELO: Record<string, number> = {
  "Korea": 1153,
  "North America": 1132,
  "EMEA": 1159,
  "China": 1134,
  "Japan": 1101,
  "Pacific": 1084,
  "default": 1200,
};

// K-factors per match context
const K_MAJOR = 48; // International Major — highest volatility
const K_CROSS = 32; // Cross-region non-major (e.g. Asia Stage)
const K_REGIONAL = 20; // Standard regional circuit match

// Calibration: new roster gets boosted K for first N games, then settles
const CALIBRATION_GAMES = 8;
const CALIBRATION_MAX_K = 1.8; // Multiplier at game 0 (80% above base)

// Roster overhaul detection
const ROSTER_REGRESSION_THRESHOLD = 0.40; // Jaccard similarity floor
const ROSTER_REGRESSION_KEEP = 0.50; // % of rating kept after overhaul
const ROSTER_MIN_PLAYERS = 3; // Min players needed to fingerprint

// Inactivity decay
const INACTIVITY_GRACE_WEEKS = 3; // Weeks before decay starts
const INACTIVITY_DECAY_RATE = 0.97; // Per week after grace period
const INACTIVITY_DECAY_FLOOR = 0.70; // Rating never drops below 70% of last active
const INACTIVITY_REMOVAL_DAYS = 180; // Hard remove after 6 months

// Partner teams (update each season)
const PARTNER_TEAMS = new Set([
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

// Team name aliases — rebrandings during the season
const TEAM_ALIASES: Record<string, string> = {};

// --- 3. HELPERS ---

function getNormalizedTeamName(name: string): string {
  const stripped = name.replace(/\s*\(.*?\)\s*$/, "");
  return TEAM_ALIASES[stripped] || stripped;
}

function getExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function isMajorTournament(name: string): boolean {
  const n = name.toLowerCase();
  if (n.includes("qualifier") || n.includes("last chance")) return false;
  if (n.includes("road to") || n.includes("open qualifier")) return false;
  const isMajorEvent = n.includes("champions clash") ||
    n.includes("midseason championship") ||
    n.includes("world finals") ||
    n.includes("ewc") ||
    n.includes("esports world cup") ||
    n.includes("major");
  if (n.includes("group stage") && !isMajorEvent) return false;
  return isMajorEvent;
}

function isCrossRegionTournament(name: string): boolean {
  const n = name.toLowerCase();
  // Japan vs Pacific road to World Finals, Asia Stage, etc.
  if (n.includes("vs pacific") || n.includes("vs japan")) return true;
  if (n.includes("asia stage")) return true;
  return false;
}

function inferRegion(tournamentName: string): string | null {
  const n = tournamentName;
  if (n.includes("Japan") && n.includes("Pacific")) return null;
  if (n.includes("Pacific")) return "Pacific";
  if (n.includes("Japan")) return "Japan";
  if (n.includes("China")) return "China";
  if (n.includes("Korea")) return "Korea";
  if (n.includes("North America") || n.includes("NA ")) return "North America";
  if (n.includes("EMEA") || n.includes("Europe")) return "EMEA";
  return null;
}

function isRegionalMatch(
  regionA: string | null,
  regionB: string | null,
): boolean {
  if (!regionA || !regionB) return false;
  return regionA === regionB;
}

// MoV modifier — only applied to the winner's K
// 3-0 dominant: ×1.2 | 3-1 solid: ×1.0 | 3-2 close: ×0.85
function getMovMultiplier(scoreA: number, scoreB: number): number {
  const total = scoreA + scoreB;
  if (total === 0) return 1.0;
  const winnerScore = Math.max(scoreA, scoreB);
  const ratio = winnerScore / total;
  if (ratio >= 0.80) return 1.20;
  if (ratio >= 0.60) return 1.00;
  return 0.85;
}

// Calibration multiplier: smooth decay from CALIBRATION_MAX_K → 1.0 over CALIBRATION_GAMES
// At game 0: ×1.8. At game 8: ×1.0. Linear.
function getCalibrationMultiplier(gamesInRoster: number): number {
  if (gamesInRoster >= CALIBRATION_GAMES) return 1.0;
  const t = gamesInRoster / CALIBRATION_GAMES;
  return CALIBRATION_MAX_K - (CALIBRATION_MAX_K - 1.0) * t;
}

// Jaccard similarity between two string arrays
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

// Extract player names from a Liquipedia match2opponent object
function extractPlayers(opp: any): string[] {
  if (!opp?.players) return [];
  return Object.values(opp.players as Record<string, any>)
    .map((p: any) => p?.displayname || p?.name || "")
    .filter(Boolean);
}

function weeksBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24 * 7);
}

// --- 4. MAIN EXPORT ---

export function calculateRankings(
  matches: any[],
  options: {
    initialTeams?: Record<string, RatedTeam>;
    isCalibration?: boolean; // forces all teams to start at 1200 (for calcStartELO)
  } = {},
): {
  rankings: RatedTeam[];
  processedMatches: ProcessedMatch[];
  allTeams: RatedTeam[];
  stats: {
    biggestMover: any | null;
    biggestLoser: any | null;
    biggestUpsets: any[];
    longestReign: any | null;
  };
} {
  if (!matches || !Array.isArray(matches)) {
    console.error("[ELO] matches is not an array:", typeof matches);
    return {
      rankings: [],
      processedMatches: [],
      allTeams: [],
      stats: {
        biggestMover: null,
        biggestLoser: null,
        biggestUpsets: [],
        longestReign: null,
      },
    };
  }

  const teams: Record<string, RatedTeam> = options.initialTeams
    ? JSON.parse(JSON.stringify(options.initialTeams))
    : {};

  const processedMatches: ProcessedMatch[] = [];
  const upsets: any[] = [];

  // --- A. Sort chronologically ---
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // --- B. Team initialiser ---
  const getTeam = (name: string, tournament: string): RatedTeam => {
    if (!teams[name]) {
      const region = inferRegion(tournament);
      const startingRating = options.isCalibration
        ? 1200
        : STARTING_ELO[region ?? ""] ?? STARTING_ELO.default;
      teams[name] = {
        name,
        region,
        rating: startingRating,
        wins: 0,
        losses: 0,
        history: [],
        form: [],
        tournaments: [],
        isPartner: PARTNER_TEAMS.has(name),
        gamesInCurrentRoster: 0,
        rosterFingerprint: [],
        inactivityDecay: 1.0,
      };
    }
    return teams[name];
  };

  // --- C. Process matches ---
  for (const match of sortedMatches) {
    if (!match.match2opponents || match.match2opponents.length < 2) continue;

    const rawNameA = match.match2opponents[0].name;
    const rawNameB = match.match2opponents[1].name;
    if (!rawNameA || !rawNameB) continue;

    const nameA = getNormalizedTeamName(rawNameA);
    const nameB = getNormalizedTeamName(rawNameB);
    const winnerId = match.winner;
    const tournament = match.tournament;
    if (!winnerId || winnerId === "0") continue;

    const teamA = getTeam(nameA, tournament);
    const teamB = getTeam(nameB, tournament);

    // Snapshot regions BEFORE updating (fixes cross-region misclassification bug)
    const snapshotRegionA = teamA.region;
    const snapshotRegionB = teamB.region;

    // Forfeit / score validation
    const oppA = match.match2opponents[0];
    const oppB = match.match2opponents[1];
    const forfeitStatuses = ["ff", "dq", "canceled", "forfeit", "w/o"];
    if (
      (oppA.status && forfeitStatuses.includes(oppA.status.toLowerCase())) ||
      (oppB.status && forfeitStatuses.includes(oppB.status.toLowerCase()))
    ) continue;
    const rawScoreA = oppA.score;
    const rawScoreB = oppB.score;
    if (
      ["-1", "FF"].includes(String(rawScoreA).toUpperCase()) ||
      ["-1", "FF"].includes(String(rawScoreB).toUpperCase())
    ) continue;
    const scoreA_val = rawScoreA === null ? 0 : Number(rawScoreA);
    const scoreB_val = rawScoreB === null ? 0 : Number(rawScoreB);
    if (isNaN(scoreA_val) || isNaN(scoreB_val)) continue;

    // Logos
    if (oppA.teamtemplate?.imageurl) {
      teamA.logo = `https://wsrv.nl/?url=${
        encodeURIComponent(oppA.teamtemplate.imageurl)
      }&w=200&we`;
    }
    if (oppA.teamtemplate?.imagedarkurl) {
      teamA.logoDark = `https://wsrv.nl/?url=${
        encodeURIComponent(oppA.teamtemplate.imagedarkurl)
      }&w=200&we`;
    }
    if (oppB.teamtemplate?.imageurl) {
      teamB.logo = `https://wsrv.nl/?url=${
        encodeURIComponent(oppB.teamtemplate.imageurl)
      }&w=200&we`;
    }
    if (oppB.teamtemplate?.imagedarkurl) {
      teamB.logoDark = `https://wsrv.nl/?url=${
        encodeURIComponent(oppB.teamtemplate.imagedarkurl)
      }&w=200&we`;
    }

    // Update region from tournament (after snapshot)
    const currentRegion = inferRegion(tournament);
    if (currentRegion) {
      teamA.region = currentRegion;
      teamB.region = currentRegion;
    }

    // Tournament tracking
    if (!teamA.tournaments.includes(tournament)) {
      teamA.tournaments.push(tournament);
    }
    if (!teamB.tournaments.includes(tournament)) {
      teamB.tournaments.push(tournament);
    }

    const matchDateStr = match.date.split(" ")[0];

    // --- ROSTER FINGERPRINTING ---
    for (const [team, opp] of [[teamA, oppA], [teamB, oppB]] as const) {
      const currentPlayers = extractPlayers(opp);
      if (currentPlayers.length >= ROSTER_MIN_PLAYERS) {
        if (team.rosterFingerprint.length >= ROSTER_MIN_PLAYERS) {
          const similarity = jaccardSimilarity(
            team.rosterFingerprint,
            currentPlayers,
          );
          if (
            similarity < ROSTER_REGRESSION_THRESHOLD &&
            (!team.lastResetDate || team.lastResetDate < matchDateStr)
          ) {
            const seed = STARTING_ELO[team.region ?? ""] ??
              STARTING_ELO.default;
            team.rating = seed * (1 - ROSTER_REGRESSION_KEEP) +
              team.rating * ROSTER_REGRESSION_KEEP;
            team.gamesInCurrentRoster = 0;
            team.lastResetDate = matchDateStr;
            console.log(
              `[ELO] Roster overhaul: ${team.name} (Jaccard: ${
                similarity.toFixed(2)
              }) → soft reset to ${Math.round(team.rating)}`,
            );
          }
        }
        team.rosterFingerprint = currentPlayers.slice(0, 6);
      }
    }

    // --- MATCH CONTEXT ---
    const isMajor = isMajorTournament(tournament);
    const isCross = !isMajor && isCrossRegionTournament(tournament);
    // Use snapshotted regions for regional check
    const isRegional = !isMajor && !isCross &&
      isRegionalMatch(snapshotRegionA, snapshotRegionB);
    const teamAWon = winnerId === "1";

    // --- K-FACTOR ---
    // 1. Base K by match context
    // Calibration mode uses 2× K — clean-slate sims need faster spread
    const kScale = options.isCalibration ? 2.0 : 1.0;
    const baseK = (isMajor ? K_MAJOR : isCross ? K_CROSS : K_REGIONAL) * kScale;

    // 2. Calibration multiplier per team (smooth, no hard cliff)
    const calibA = getCalibrationMultiplier(teamA.gamesInCurrentRoster);
    const calibB = getCalibrationMultiplier(teamB.gamesInCurrentRoster);

    // 3. MoV — only applied to the winner
    const mov = getMovMultiplier(scoreA_val, scoreB_val);

    // Winner gets MoV bonus, loser gets flat K
    let kA = baseK * calibA * (teamAWon ? mov : 1.0);
    let kB = baseK * calibB * (!teamAWon ? mov : 1.0);

    // --- ELO CALCULATION ---
    const expectedA = getExpectedScore(teamA.rating, teamB.rating);
    const expectedB = 1 - expectedA;
    const actualA = teamAWon ? 1 : 0;
    const actualB = teamAWon ? 0 : 1;

    const changeA = kA * (actualA - expectedA);
    const changeB = kB * (actualB - expectedB);

    teamA.rating += changeA;
    teamB.rating += changeB;

    teamA.gamesInCurrentRoster++;
    teamB.gamesInCurrentRoster++;
    teamA.lastMatchDate = match.date;
    teamB.lastMatchDate = match.date;
    teamA.inactivityDecay = 1.0;
    teamB.inactivityDecay = 1.0;

    teamA.history.push({ date: match.date, elo: teamA.rating });
    teamB.history.push({ date: match.date, elo: teamB.rating });

    if (teamAWon) {
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

    // Map details
    const mapDetails = match.match2games?.map((game: any) => {
      const bans: string[] = [];
      if (game.extradata?.team1ban1) bans.push(game.extradata.team1ban1);
      if (game.extradata?.team2ban1) bans.push(game.extradata.team2ban1);
      let scoreDisplay = "";
      if (game.scores?.length === 2) {
        scoreDisplay = game.mode === "Push"
          ? `${Math.round(game.scores[0])}m - ${Math.round(game.scores[1])}m`
          : `${game.scores[0]} - ${game.scores[1]}`;
      }
      return {
        name: game.map,
        mode: game.mode,
        score: scoreDisplay,
        winner: game.winner,
        bans,
      };
    }) || [];

    processedMatches.push({
      id: match.id || `${matchDateStr}-${nameA}-${nameB}`,
      date: match.date,
      tournament,
      team_a: nameA,
      team_b: nameB,
      score_a: scoreA_val,
      score_b: scoreB_val,
      winner_id: winnerId,
      is_major: isMajor,
      is_regional: isRegional,
      elo_change_a: changeA,
      elo_change_b: changeB,
      team_a_elo_after: teamA.rating,
      team_b_elo_after: teamB.rating,
      details: {
        mvp: match.extradata?.mvp?.players?.["1"]?.displayname || null,
        maps: mapDetails,
        debug: {
          k_a: kA,
          k_b: kB,
          base_k: baseK,
          expected_a: expectedA,
          expected_b: expectedB,
          mov_multiplier: mov,
          games_in_roster_a: teamA.gamesInCurrentRoster,
          games_in_roster_b: teamB.gamesInCurrentRoster,
          is_major: isMajor,
          is_regional: isRegional,
        },
      },
    });

    // Upset detection (using live ratings)
    const winnerProb = teamAWon ? expectedA : expectedB;
    if (winnerProb < 0.35) {
      const winner = teamAWon ? teamA : teamB;
      const loser = teamAWon ? teamB : teamA;
      upsets.push({
        winner: winner.name,
        winnerLogo: winner.logo,
        winnerLogoDark: winner.logoDark,
        loser: loser.name,
        loserLogo: loser.logo,
        loserLogoDark: loser.logoDark,
        prob: winnerProb,
        date: match.date,
        tournament,
        diff: Math.abs(changeA),
      });
    }
  }

  // --- D. POST-LOOP: Inactivity decay ---
  const now = new Date();
  for (const team of Object.values(teams)) {
    if (!team.lastMatchDate) continue;
    const lastMatch = new Date(team.lastMatchDate);
    const weeksInactive = weeksBetween(now, lastMatch);
    if (weeksInactive > INACTIVITY_GRACE_WEEKS) {
      const decayWeeks = weeksInactive - INACTIVITY_GRACE_WEEKS;
      const decay = Math.max(
        INACTIVITY_DECAY_FLOOR,
        Math.pow(INACTIVITY_DECAY_RATE, decayWeeks),
      );
      if (decay < team.inactivityDecay) {
        team.inactivityDecay = decay;
        team.rating *= decay;
      }
    }
  }

  // --- E. STATS ---

  // rankDelta — weekly rank movement, undefined for inactive teams
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const allTeamsList = Object.values(teams);
  const currentRankings = [...allTeamsList].sort((a, b) => b.rating - a.rating);

  const getPastRating = (team: RatedTeam): number => {
    const entry = team.history.filter((h) => new Date(h.date) <= oneWeekAgo)
      .pop();
    return entry
      ? entry.elo
      : STARTING_ELO[team.region ?? ""] ?? STARTING_ELO.default;
  };

  const oldRankings = [...allTeamsList].sort((a, b) =>
    getPastRating(b) - getPastRating(a)
  );
  const oldRankMap = new Map<string, number>();
  oldRankings.forEach((t, i) => oldRankMap.set(t.name, i + 1));

  currentRankings.forEach((team, index) => {
    const currentRank = index + 1;
    const oldRank = oldRankMap.get(team.name) ?? currentRank;
    const lastMatchDate = team.lastMatchDate
      ? new Date(team.lastMatchDate)
      : null;
    team.rankDelta = lastMatchDate && lastMatchDate >= oneWeekAgo
      ? oldRank - currentRank
      : undefined;
  });

  // Form trim
  currentRankings.forEach((t) => {
    if (t.form.length > 5) t.form = t.form.slice(-5);
  });

  // Biggest mover / loser (best single-match change in last 7 days)
  const recentMatches = processedMatches.filter((m) =>
    new Date(m.date) >= oneWeekAgo
  );
  const matchMoves: any[] = [];
  for (const m of recentMatches) {
    const tA = teams[m.team_a], tB = teams[m.team_b];
    if (tA) {
      matchMoves.push({
        name: m.team_a,
        diff: m.elo_change_a,
        current: tA.rating,
        logo: tA.logo,
        logoDark: tA.logoDark,
        opponent: m.team_b,
        date: m.date,
        tournament: m.tournament,
      });
    }
    if (tB) {
      matchMoves.push({
        name: m.team_b,
        diff: m.elo_change_b,
        current: tB.rating,
        logo: tB.logo,
        logoDark: tB.logoDark,
        opponent: m.team_a,
        date: m.date,
        tournament: m.tournament,
      });
    }
  }
  const biggestMover = matchMoves.length
    ? [...matchMoves].sort((a, b) => b.diff - a.diff)[0]
    : null;
  const biggestLoser = matchMoves.length
    ? [...matchMoves].sort((a, b) => a.diff - b.diff)[0]
    : null;

  // Biggest upsets (Majors only)
  const biggestUpsets = upsets
    .filter((u) => isMajorTournament(u.tournament))
    .sort((a, b) => a.prob - b.prob)
    .slice(0, 2);

  // Days at #1
  const daysAtOne: Record<string, number> = {};
  const allDates = new Set<string>();
  allTeamsList.forEach((t) =>
    t.history.forEach((h) => allDates.add(h.date.split(" ")[0]))
  );
  const sortedDates = Array.from(allDates).sort();
  const today = now.toISOString().split("T")[0];
  if (sortedDates.length > 0 && sortedDates[sortedDates.length - 1] < today) {
    sortedDates.push(today);
  }
  if (sortedDates.length >= 2) {
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const startDate = sortedDates[i];
      const endDate = sortedDates[i + 1];
      const diffDays = Math.ceil(
        Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) /
          86400000,
      );
      let topTeam: string | null = null;
      let maxElo = -1;
      allTeamsList.forEach((t) => {
        const hasStarted = t.history.some((h) =>
          h.date.split(" ")[0] <= startDate
        );
        if (!hasStarted) return;
        let elo = STARTING_ELO[t.region ?? ""] ?? STARTING_ELO.default;
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
      if (topTeam) daysAtOne[topTeam] = (daysAtOne[topTeam] || 0) + diffDays;
    }
  }
  const kingName = Object.keys(daysAtOne).reduce<string | null>(
    (a, b) => a === null || daysAtOne[b] > daysAtOne[a] ? b : a,
    null,
  );
  const longestReign = kingName
    ? {
      name: kingName,
      days: daysAtOne[kingName],
      logo: teams[kingName]?.logo,
      logoDark: teams[kingName]?.logoDark,
    }
    : null;

  // --- F. FILTER ---
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_REMOVAL_DAYS);

  const filteredRankings = currentRankings.filter((t) => {
    if (!t.lastMatchDate) return false;
    if (new Date(t.lastMatchDate) < cutoffDate) return false;
    if (t.rating < 900) return false;
    return true;
  });

  return {
    rankings: filteredRankings,
    processedMatches,
    allTeams: allTeamsList,
    stats: { biggestMover, biggestLoser, biggestUpsets, longestReign },
  };
}
