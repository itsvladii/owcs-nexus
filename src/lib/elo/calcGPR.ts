// =============================================================================
// calcGPR.ts — Global Power Rating (GPR) System for OWCS Nexus
// =============================================================================
//
// GPR is a composite ranking system built from three independent pillars:
//
//   P1 · Consistency Score  (40%) — season-long performance vs. opponent quality
//   P2 · International Score (45%) — performance-over-expectation at Majors
//   P3 · Momentum Score     (15%) — exponentially decayed recent form (8 weeks)
//
// No single match can swing the global ranking drastically. The system is
// designed to reward teams that consistently show up AND perform when it counts.
//
// Roster continuity is tracked automatically via player-overlap fingerprinting.
// Inactivity is handled via gradual decay, not hard removal.
// =============================================================================

// --- 1. TYPES ---

export interface GPRTeam {
  name: string;
  gpr: number; // Final composite GPR score (0–1000 scale)
  gprRaw: {
    consistency: number; // P1 raw score before weighting
    international: number; // P2 raw score before weighting
    momentum: number; // P3 raw score before weighting
  };
  region: string | null;
  regionalSeed: number; // Seed from calcStartGPR (replaces STARTING_ELO)
  wins: number;
  losses: number;
  logo?: string;
  logoDark?: string;
  history: { date: string; gpr: number }[];
  form: ("W" | "L")[];
  tournaments: string[];
  isPartner: boolean;
  rankDelta?: number;
  // Roster continuity
  rosterFingerprint: string[]; // Last known 5-starter lineup
  rosterConfidence: number; // 0–1: how "settled" this roster is (games played / 8)
  lastRosterRegressionDate?: string;
  // Inactivity
  lastMatchDate?: string;
  inactivityDecay: number; // Current decay multiplier (1.0 = fresh, 0.70 = floor)
}

export interface GPRMatch {
  id: string;
  date: string;
  tournament: string;
  team_a: string;
  team_b: string;
  score_a: number;
  score_b: number;
  winner_id: string;
  isMajor: boolean;
  isRegional: boolean;
  gpr_change_a: number;
  gpr_change_b: number;
  team_a_gpr_after: number;
  team_b_gpr_after: number;
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
      p1_points_a: number;
      p1_points_b: number;
      p2_perf_a: number;
      p2_perf_b: number;
      opp_tier_a: string;
      opp_tier_b: string;
      mov_multiplier: number;
      roster_confidence_a: number;
      roster_confidence_b: number;
      is_major: boolean;
      is_regional: boolean;
    };
  };
}

// --- 2. CONFIGURATION ---

// Pillar weights — must sum to 1.0
const W_CONSISTENCY = 0.40;
const W_INTERNATIONAL = 0.45;
const W_MOMENTUM = 0.15;

// GPR scale: all pillar outputs are normalised to [0, 1000]
const GPR_SCALE = 1000;

// Regional seeds — output of calcStartGPR.ts (same calibration script, new name)
// These represent "how strong is the average top team entering from this region"
const REGIONAL_SEEDS: Record<string, number> = {
  "Korea": 581,
  "North America": 574,
  "EMEA": 586,
  "China": 576,
  "Japan": 556,
  "Pacific": 547,
  "default": 590,
};

// Partner teams for the current season
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

// Team name aliases (rebrandings during the season)
const TEAM_ALIASES: Record<string, string> = {
  "Anyone's Legend": "1234",
  "The Gatos Guapos": "SHENGSHI",
  "Rankers": "Naidorf",
  "Quasar Esports": "Trap12",
  "ONSIDE GAMING": "ZANSIDE GAMING",
};

// --- PILLAR 1: CONSISTENCY ---
// Points earned per win in a regional match
const P1_BASE_REGIONAL = 10;
// Points earned per win in a Major match (used for the non-Major vs Major split inside P1)
const P1_BASE_MAJOR = 22;
// Regional match compression — these are zero-sum within the region bubble
const P1_REGIONAL_COMPRESSION = 0.60;
// Opponent tier multipliers (tier determined by their GPR rank at match time)
const OPP_TIER: Record<string, number> = {
  elite: 2.5, // Top 5 teams globally
  strong: 1.8, // Top 6–10
  solid: 1.2, // Top 11–25
  weak: 0.7, // Everyone else
};
// Slight MoV modifier — acknowledges margin without over-rewarding stomps
// 3-0 = 1.10x, 3-1 = 1.00x, 3-2 = 0.90x
// (applied only to winner's points, not the loser's deduction)
function getMovMultiplier(scoreA: number, scoreB: number): number {
  const diff = Math.abs(scoreA - scoreB);
  const total = scoreA + scoreB;
  if (total === 0) return 1.0;
  const ratio = diff / total;
  if (ratio >= 0.6) return 1.10; // Dominant (3-0, 4-0, 4-1)
  if (ratio >= 0.3) return 1.00; // Solid (3-1, 4-2)
  return 0.90; // Close (3-2, 4-3)
}

// --- PILLAR 2: INTERNATIONAL ---
// Logistic win probability — same formula as ELO expected score
// but using REGIONAL_SEED as the "baseline" when teams haven't played
// each other before internationally.
function getWinProbability(seedA: number, seedB: number): number {
  return 1 / (1 + Math.pow(10, (seedB - seedA) / 150));
}
// Scale for how much an international over/under-performance shifts the score
const P2_SCALE = 200;
// Neutral interpolation weight for teams with no Major appearances
// (they get 50% of their regional seed contributed to the International pillar)
const P2_NO_MAJOR_INTERPOLATION = 0.5;

// --- PILLAR 3: MOMENTUM ---
// Exponential decay weight per week back in time
const P3_DECAY_PER_WEEK = 0.75;
// How many weeks back we look
const P3_LOOKBACK_WEEKS = 8;
// Win = +1, Loss = 0 before weighting

// --- INACTIVITY DECAY ---
// Starts after this many weeks with no match
const INACTIVITY_GRACE_WEEKS = 3;
// Decay per week of inactivity (applied to Consistency + International pillars)
const INACTIVITY_DECAY_PER_WEEK = 0.97;
// Floor — a team never drops below 70% of their last active score
const INACTIVITY_DECAY_FLOOR = 0.70;
// Absolute GPR floor below which a team is removed from rankings
const GPR_REMOVAL_FLOOR = 250;

// --- ROSTER CONTINUITY ---
// Jaccard similarity threshold below which a soft regression fires
const ROSTER_REGRESSION_THRESHOLD = 0.40;
// How much of the team's current GPR they keep after a roster overhaul
// newScore = seed × (1 - KEEP) + currentScore × KEEP
const ROSTER_REGRESSION_KEEP = 0.45;
// How many games before a new roster is considered "settled" (full P1 weight)
const ROSTER_CONFIDENCE_GAMES = 8;

// --- 3. HELPERS ---

function getNormalizedTeamName(name: string): string {
  const stripped = name.replace(/\s*\(.*?\)\s*$/, "");
  return TEAM_ALIASES[stripped] || stripped;
}

function isMajorTournament(name: string): boolean {
  const n = name.toLowerCase();
  // Hard excludes
  if (n.includes("qualifier") || n.includes("last chance")) return false;
  if (n.includes("road to")) return false;
  // Detect Major event
  const isMajorEvent = n.includes("champions clash") ||
    n.includes("midseason championship") ||
    n.includes("world finals") ||
    n.includes("ewc") ||
    n.includes("esports world cup") ||
    n.includes("major");
  // "group stage" alone = regional, but "Midseason Championship Group Stage" = part of a Major
  if (n.includes("group stage") && !isMajorEvent) return false;
  return isMajorEvent;
}

function inferRegion(tournamentName: string): string | null {
  const n = tournamentName;
  if (n.includes("Japan") && n.includes("Pacific")) return null;
  if (n.includes("Pacific")) return "Pacific";
  if (n.includes("Japan")) return "Japan";
  if (n.includes("China")) return "China";
  if (n.includes("Korea") || n.includes("Asia")) return "Korea";
  if (n.includes("North America") || n.includes("NA")) return "North America";
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

// Determine opponent tier from their current rank position in the global rankings
function getOpponentTier(
  oppName: string,
  currentRankMap: Map<string, number>,
): string {
  const rank = currentRankMap.get(oppName);
  if (rank === undefined) return "weak"; // Unranked = treat as weak
  if (rank <= 5) return "elite";
  if (rank <= 10) return "strong";
  if (rank <= 25) return "solid";
  return "weak";
}

// Extract player names from match opponent data
function extractPlayers(opp: any): string[] {
  if (!opp?.players) return [];
  // Liquipedia returns players as an object keyed by position: { "1": {name, displayname}, ... }
  return Object.values(opp.players as Record<string, any>)
    .map((p: any) => p?.displayname || p?.name || "")
    .filter(Boolean);
}

// Jaccard similarity between two sets
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

// Compute weeks between two dates
function weeksBetween(dateA: Date, dateB: Date): number {
  return Math.abs(dateA.getTime() - dateB.getTime()) /
    (1000 * 60 * 60 * 24 * 7);
}

// --- 4. PER-TEAM ACCUMULATORS ---
// These track the raw signals per team across the season.
// They live separately from GPRTeam to keep the match loop clean.

interface TeamAccumulator {
  // P1: list of points earned per match (regional and major, already multiplied)
  p1Entries: { points: number; date: string }[];
  // P2: list of (actual - expected) per Major match
  p2Entries: { perf: number; date: string }[];
  // P3: list of (1 = win, 0 = loss) with date, for the decay window
  p3Entries: { result: 1 | 0; date: string }[];
}

// --- 5. MAIN EXPORT ---

export function calculateGPR(
  matches: any[],
  options: {
    initialTeams?: Record<string, GPRTeam>;
    initialAccumulators?: Record<string, TeamAccumulator>;
  } = {},
): {
  rankings: GPRTeam[];
  processedMatches: GPRMatch[];
  allTeams: GPRTeam[];
  accumulators: Record<string, TeamAccumulator>;
  stats: {
    biggestMover: any | null;
    biggestLoser: any | null;
    biggestUpsets: any[];
    longestReign: any | null;
  };
} {
  if (!matches || !Array.isArray(matches)) {
    console.error("[GPR] 'matches' is not an array:", typeof matches);
    return {
      rankings: [],
      processedMatches: [],
      allTeams: [],
      accumulators: {},
      stats: {
        biggestMover: null,
        biggestLoser: null,
        biggestUpsets: [],
        longestReign: null,
      },
    };
  }

  // Deep-clone initial state to avoid mutation
  const teams: Record<string, GPRTeam> = options.initialTeams
    ? JSON.parse(JSON.stringify(options.initialTeams))
    : {};
  const accumulators: Record<string, TeamAccumulator> =
    options.initialAccumulators
      ? JSON.parse(JSON.stringify(options.initialAccumulators))
      : {};

  const processedMatches: GPRMatch[] = [];
  const upsets: any[] = [];

  // --- A. Sort chronologically ---
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // --- B. Helper: initialise a new team ---
  const getTeam = (name: string, tournament: string): GPRTeam => {
    if (!teams[name]) {
      const region = inferRegion(tournament);
      const seed = REGIONAL_SEEDS[region ?? ""] ?? REGIONAL_SEEDS.default;
      teams[name] = {
        name,
        region,
        gpr: seed,
        gprRaw: { consistency: seed, international: seed, momentum: seed },
        regionalSeed: seed,
        wins: 0,
        losses: 0,
        history: [],
        form: [],
        tournaments: [],
        isPartner: PARTNER_TEAMS.has(name),
        rosterFingerprint: [],
        rosterConfidence: 0,
        inactivityDecay: 1.0,
      };
    }
    if (!accumulators[name]) {
      accumulators[name] = { p1Entries: [], p2Entries: [], p3Entries: [] };
    }
    return teams[name];
  };

  // --- C. Build a live rank map (updated after every match for tier lookups) ---
  // We start from seeds and recompute after each match.
  // This avoids circular dependency: tier uses rank, rank uses GPR, GPR uses tier.
  // The rank map lags by one match — acceptable tradeoff for determinism.
  const getLiveRankMap = (): Map<string, number> => {
    const sorted = Object.values(teams).sort((a, b) => b.gpr - a.gpr);
    const map = new Map<string, number>();
    sorted.forEach((t, i) => map.set(t.name, i + 1));
    return map;
  };

  // --- D. Process matches ---
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

    // Snapshot regions BEFORE updating them (fixes mid-Major region flip bug)
    const snapshotRegionA = teamA.region;
    const snapshotRegionB = teamB.region;

    const matchDate = new Date(match.date);
    const matchDateStr = match.date.split(" ")[0];

    // Forfeit check
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

    // Update region from current tournament (after snapshot)
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

    // --- ROSTER CONTINUITY CHECK ---
    for (const [team, opp] of [[teamA, oppA], [teamB, oppB]] as const) {
      const currentPlayers = extractPlayers(opp);
      if (currentPlayers.length >= 3) {
        const similarity = jaccardSimilarity(
          team.rosterFingerprint,
          currentPlayers,
        );
        if (
          team.rosterFingerprint.length >= 3 &&
          similarity < ROSTER_REGRESSION_THRESHOLD &&
          (!team.lastRosterRegressionDate ||
            team.lastRosterRegressionDate < matchDateStr)
        ) {
          const seed = REGIONAL_SEEDS[team.region ?? ""] ??
            REGIONAL_SEEDS.default;
          // Soft regression: keep ROSTER_REGRESSION_KEEP of current score, pull toward seed
          team.gpr = seed * (1 - ROSTER_REGRESSION_KEEP) +
            team.gpr * ROSTER_REGRESSION_KEEP;
          team.rosterConfidence = 0;
          team.lastRosterRegressionDate = matchDateStr;
          // Clear accumulators so stale performances don't continue counting
          accumulators[team.name] = {
            p1Entries: [],
            p2Entries: [],
            p3Entries: [],
          };
          console.log(
            `[GPR] Roster overhaul detected: ${team.name} (similarity: ${
              similarity.toFixed(2)
            }) → regressed to ${Math.round(team.gpr)}`,
          );
        }
        // Always update fingerprint to last seen lineup
        team.rosterFingerprint = currentPlayers.slice(0, 6);
      }
    }

    // Increment roster confidence (capped at 1.0 after ROSTER_CONFIDENCE_GAMES)
    teamA.rosterConfidence = Math.min(
      1.0,
      (teamA.rosterConfidence * ROSTER_CONFIDENCE_GAMES + 1) /
        ROSTER_CONFIDENCE_GAMES,
    );
    teamB.rosterConfidence = Math.min(
      1.0,
      (teamB.rosterConfidence * ROSTER_CONFIDENCE_GAMES + 1) /
        ROSTER_CONFIDENCE_GAMES,
    );

    // --- MATCH CONTEXT FLAGS ---
    const isMajor = isMajorTournament(tournament);
    // Use snapshotted regions for the regional check to avoid mid-Major flip
    const isRegional = isRegionalMatch(snapshotRegionA, snapshotRegionB);
    const teamAWon = winnerId === "1";
    const mov = getMovMultiplier(scoreA_val, scoreB_val);

    // Live rank map for opponent tier calculation
    const rankMap = getLiveRankMap();
    const tierA = getOpponentTier(nameA, rankMap); // Tier of A (used for B's reward)
    const tierB = getOpponentTier(nameB, rankMap); // Tier of B (used for A's reward)

    const acc = (name: string) => accumulators[name];

    // =========================================================================
    // PILLAR 1 — CONSISTENCY
    // Points per win, scaled by opponent tier, compressed for regional matches
    // =========================================================================
    const baseP1 = isMajor ? P1_BASE_MAJOR : P1_BASE_REGIONAL;
    // A gets points if A won, B gets points if B won
    // Opponent tier of A matters for B's reward, and vice versa
    const p1PointsA = teamAWon
      ? baseP1 * OPP_TIER[tierB] * mov *
        (isRegional && !isMajor ? P1_REGIONAL_COMPRESSION : 1.0) *
        teamA.rosterConfidence
      : 0;
    const p1PointsB = !teamAWon
      ? baseP1 * OPP_TIER[tierA] * mov *
        (isRegional && !isMajor ? P1_REGIONAL_COMPRESSION : 1.0) *
        teamB.rosterConfidence
      : 0;

    acc(nameA).p1Entries.push({ points: p1PointsA, date: match.date });
    acc(nameB).p1Entries.push({ points: p1PointsB, date: match.date });

    // =========================================================================
    // PILLAR 2 — INTERNATIONAL (Majors only)
    // Performance-over-expectation: actual result − win probability
    // =========================================================================
    let p2PerfA = 0, p2PerfB = 0;
    if (isMajor) {
      const probA = getWinProbability(teamA.regionalSeed, teamB.regionalSeed);
      const probB = 1 - probA;
      const actualA = teamAWon ? 1 : 0;
      const actualB = teamAWon ? 0 : 1;
      p2PerfA = actualA - probA;
      p2PerfB = actualB - probB;
      acc(nameA).p2Entries.push({ perf: p2PerfA, date: match.date });
      acc(nameB).p2Entries.push({ perf: p2PerfB, date: match.date });
    }

    // =========================================================================
    // PILLAR 3 — MOMENTUM
    // Binary win/loss, will be decay-weighted when GPR is computed
    // =========================================================================
    acc(nameA).p3Entries.push({ result: teamAWon ? 1 : 0, date: match.date });
    acc(nameB).p3Entries.push({ result: teamAWon ? 0 : 1, date: match.date });

    // Mark last match date (resets inactivity)
    teamA.lastMatchDate = match.date;
    teamB.lastMatchDate = match.date;
    teamA.inactivityDecay = 1.0;
    teamB.inactivityDecay = 1.0;

    // Win/loss records
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

    // =========================================================================
    // COMPUTE UPDATED GPR FOR BOTH TEAMS
    // =========================================================================
    const gprBeforeA = teamA.gpr;
    const gprBeforeB = teamB.gpr;

    computeGPR(teamA, accumulators[nameA], matchDate);
    computeGPR(teamB, accumulators[nameB], matchDate);

    const gprChangeA = teamA.gpr - gprBeforeA;
    const gprChangeB = teamB.gpr - gprBeforeB;

    teamA.history.push({ date: match.date, gpr: teamA.gpr });
    teamB.history.push({ date: match.date, gpr: teamB.gpr });

    // Map details extraction
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
      isMajor,
      isRegional,
      gpr_change_a: gprChangeA,
      gpr_change_b: gprChangeB,
      team_a_gpr_after: teamA.gpr,
      team_b_gpr_after: teamB.gpr,
      details: {
        mvp: match.extradata?.mvp?.players?.["1"]?.displayname || null,
        maps: mapDetails,
        debug: {
          p1_points_a: p1PointsA,
          p1_points_b: p1PointsB,
          p2_perf_a: p2PerfA,
          p2_perf_b: p2PerfB,
          opp_tier_a: tierA,
          opp_tier_b: tierB,
          mov_multiplier: mov,
          roster_confidence_a: teamA.rosterConfidence,
          roster_confidence_b: teamB.rosterConfidence,
          is_major: isMajor,
          is_regional: isRegional,
        },
      },
    });

    // Upset detection: winner was less than 35% to win
    const winnerProb = teamAWon
      ? getWinProbability(teamA.regionalSeed, teamB.regionalSeed)
      : getWinProbability(teamB.regionalSeed, teamA.regionalSeed);
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
        diff: Math.abs(gprChangeA),
      });
    }
  }

  // --- E. POST-LOOP: apply inactivity decay to all teams ---
  const now = new Date();
  for (const team of Object.values(teams)) {
    if (!team.lastMatchDate) continue;
    const lastMatch = new Date(team.lastMatchDate);
    const weeksInactive = weeksBetween(now, lastMatch);
    if (weeksInactive > INACTIVITY_GRACE_WEEKS) {
      const decayWeeks = weeksInactive - INACTIVITY_GRACE_WEEKS;
      team.inactivityDecay = Math.max(
        INACTIVITY_DECAY_FLOOR,
        Math.pow(INACTIVITY_DECAY_PER_WEEK, decayWeeks),
      );
      // Recompute GPR with decay applied (affects P1 and P2 only — momentum already decays naturally)
      const acc = accumulators[team.name];
      if (acc) {
        computeGPR(team, acc, now, team.inactivityDecay);
      }
    }
  }

  // --- F. RANKING DELTA (weekly momentum in rank position) ---
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const allTeamsList = Object.values(teams);
  const currentRankings = [...allTeamsList].sort((a, b) => b.gpr - a.gpr);

  const getPastGPR = (team: GPRTeam): number => {
    const entry = team.history.filter((h) => new Date(h.date) <= oneWeekAgo)
      .pop();
    return entry ? entry.gpr : team.regionalSeed;
  };

  const oldRankings = [...allTeamsList].sort((a, b) =>
    getPastGPR(b) - getPastGPR(a)
  );
  const oldRankMap = new Map<string, number>();
  oldRankings.forEach((t, i) => oldRankMap.set(t.name, i + 1));

  currentRankings.forEach((team, index) => {
    const currentRank = index + 1;
    const oldRank = oldRankMap.get(team.name) ?? currentRank;
    const lastMatchDate = team.lastMatchDate
      ? new Date(team.lastMatchDate)
      : null;
    // Only show delta if the team actually played this week
    team.rankDelta = lastMatchDate && lastMatchDate >= oneWeekAgo
      ? oldRank - currentRank
      : undefined;
  });

  // --- G. FORM TRIM ---
  currentRankings.forEach((t) => {
    if (t.form.length > 5) t.form = t.form.slice(-5);
  });

  // --- H. STATS ---

  // Biggest mover / loser (best and worst single-match GPR change in last 7 days)
  const recentMatches = processedMatches.filter((m) =>
    new Date(m.date) >= oneWeekAgo
  );
  const matchMoves: any[] = [];
  for (const m of recentMatches) {
    const tA = teams[m.team_a], tB = teams[m.team_b];
    if (tA) {
      matchMoves.push({
        name: m.team_a,
        diff: m.gpr_change_a,
        current: tA.gpr,
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
        diff: m.gpr_change_b,
        current: tB.gpr,
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

  // Biggest upsets (Major matches only)
  const biggestUpsets = upsets
    .filter((u) => {
      const t = u.tournament.toLowerCase();
      return !t.includes("qualifier") &&
        (t.includes("major") || t.includes("midseason") ||
          t.includes("world") || t.includes("clash"));
    })
    .sort((a, b) => a.prob - b.prob)
    .slice(0, 2);

  // Days at #1 (King of the Hill)
  const daysAtOne: Record<string, number> = {};
  const allDates = new Set<string>();
  Object.values(teams).forEach((t) =>
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
      let maxGPR = -1;
      Object.values(teams).forEach((t) => {
        const hasStarted = t.history.some((h) =>
          h.date !== "2026-01-01" && h.date.split(" ")[0] <= startDate
        );
        if (!hasStarted) return;
        let gpr = t.regionalSeed;
        for (let h = t.history.length - 1; h >= 0; h--) {
          if (t.history[h].date.split(" ")[0] <= startDate) {
            gpr = t.history[h].gpr;
            break;
          }
        }
        if (gpr > maxGPR) {
          maxGPR = gpr;
          topTeam = t.name;
        }
      });
      if (topTeam) daysAtOne[topTeam] = (daysAtOne[topTeam] || 0) + diffDays;
    }
  }

  const kingName = Object.keys(daysAtOne).reduce<string | null>(
    (a, b) => (a === null || daysAtOne[b] > daysAtOne[a] ? b : a),
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

  // --- I. FINAL FILTER ---
  const filteredRankings = currentRankings.filter((t) =>
    t.gpr >= GPR_REMOVAL_FLOOR && !!t.lastMatchDate
  );

  return {
    rankings: filteredRankings,
    processedMatches,
    allTeams: allTeamsList,
    accumulators,
    stats: { biggestMover, biggestLoser, biggestUpsets, longestReign },
  };
}

// =============================================================================
// computeGPR — derives the composite GPR score from a team's accumulators.
// Called after every match AND after the post-loop inactivity pass.
// =============================================================================
function computeGPR(
  team: GPRTeam,
  acc: TeamAccumulator,
  asOf: Date,
  inactivityDecay: number = 1.0,
): void {
  const seed = team.regionalSeed;

  // --- P1: Consistency ---
  // Sum of all P1 points earned, normalised to a [0, GPR_SCALE] range.
  // We use a soft saturation curve (sqrt) so late-season teams don't
  // compound infinitely — a team with 30 wins doesn't get 10× a team with 3.
  const rawP1 = acc.p1Entries.reduce((s, e) => s + e.points, 0);
  // Reference max: a top-tier team winning ~20 regional matches + 4 major matches
  // would accumulate roughly: 20 × (10 × 1.2 × 0.6) + 4 × (22 × 2.5 × 1.0) ≈ 364
  const P1_REFERENCE = 350;
  const p1Normalised = Math.min(1.0, Math.sqrt(rawP1 / P1_REFERENCE));
  // Blend toward seed so teams with few matches stay near their regional baseline
  const p1Blend = acc.p1Entries.length >= 5 ? 1.0 : acc.p1Entries.length / 5;
  const p1Score = seed * (1 - p1Blend) +
    (seed + (GPR_SCALE - seed) * p1Normalised) * p1Blend;

  // --- P2: International ---
  if (acc.p2Entries.length === 0) {
    // No Major appearances: interpolate between seed and neutral (GPR_SCALE / 2)
    // so not participating doesn't crater the team to zero
    team.gprRaw.international = seed * P2_NO_MAJOR_INTERPOLATION +
      (GPR_SCALE / 2) * (1 - P2_NO_MAJOR_INTERPOLATION);
  } else {
    const totalPerf = acc.p2Entries.reduce((s, e) => s + e.perf, 0);
    const normPerf = totalPerf / acc.p2Entries.length; // [-1, 1]
    // Map to [seed - P2_SCALE, seed + P2_SCALE], then clamp to [0, GPR_SCALE]
    const p2Raw = seed + normPerf * P2_SCALE;
    team.gprRaw.international = Math.max(0, Math.min(GPR_SCALE, p2Raw));
  }

  // --- P3: Momentum (exponential decay) ---
  let p3Weighted = 0;
  let p3TotalWeight = 0;
  const cutoff = new Date(asOf);
  cutoff.setDate(cutoff.getDate() - P3_LOOKBACK_WEEKS * 7);

  for (const entry of acc.p3Entries) {
    const entryDate = new Date(entry.date);
    if (entryDate < cutoff) continue;
    const weeksAgo = weeksBetween(asOf, entryDate);
    const weight = Math.pow(P3_DECAY_PER_WEEK, weeksAgo);
    p3Weighted += entry.result * weight;
    p3TotalWeight += weight;
  }

  const p3WinRate = p3TotalWeight > 0 ? p3Weighted / p3TotalWeight : 0.5;
  // Map win rate [0, 1] to GPR scale, centred on seed
  team.gprRaw.momentum = seed * (1 - p3WinRate) + GPR_SCALE * p3WinRate;

  // Apply inactivity decay to P1 and P2 (Momentum already decays naturally)
  const decayedP1 = p1Score * inactivityDecay;
  const decayedP2 = team.gprRaw.international * inactivityDecay;

  // --- Composite GPR ---
  const composite = decayedP1 * W_CONSISTENCY +
    decayedP2 * W_INTERNATIONAL +
    team.gprRaw.momentum * W_MOMENTUM;

  team.gprRaw.consistency = p1Score;
  team.gpr = Math.max(0, Math.min(GPR_SCALE, composite));
}
