import "dotenv/config";
import { calculateRankings } from "./calcELO";
import { fetchPastSeasons } from "../stats/fetchMatches";
import type { ProcessedMatch, RatedTeam } from "./calcELO";

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_BASELINE = 1200;
const REGRESSION_FACTOR = 0.6;
const API_KEY = process.env.LIQUIPEDIA_API_KEY;

// How many games a peak must be sustained over to count as real (not a fluke)
const MIN_PEAK_GAMES = 3;

// Minimum qualifying thresholds for a team to be considered in calibration
const MIN_TOTAL_GAMES = 8;
const MIN_WINS = 2;
const MIN_RATING_FLOOR = 1000;

// How much each signal contributes to the final baseline.
// International: how well the region performed in Majors/global events.
// Depth: how competitive and even the region is domestically.
const INTERNATIONAL_WEIGHT = 0.6;
const DEPTH_WEIGHT = 0.4;

// Depth variance penalty coefficient. Higher = harsher penalty for lopsided regions.
// At 0.3, a stdDev of 100 points (fairly uneven region) results in a ~30pt penalty.
const DEPTH_VARIANCE_PENALTY_COEFF = 0.3;
const DEPTH_VARIANCE_PENALTY_CAP = 50; // Maximum penalty in ELO points

// =============================================================================
// HELPER: isMajorTournament
// Mirrors the same logic in calcELO.ts so we're consistent about what counts
// as an international event for the purposes of the international score.
// =============================================================================
function isMajorTournament(name: string): boolean {
  const n = name.toLowerCase();

  // Explicitly exclude qualifier/road-to events first, regardless of other keywords.
  // These can contain words like "world", "midseason", or "clash" in their name
  // but are regional qualifiers, not international major events.
  if (n.includes("qualifier") || n.includes("last chance")) return false;
  if (n.includes("road to")) return false;

  // Match known major event keywords only after exclusions pass
  if (n.includes("champions clash")) return true;
  if (n.includes("midseason championship")) return true;
  if (n.includes("world finals")) return true;
  if (n.includes("ewc") || n.includes("esports world cup")) return true;
  if (n.includes("major")) return true;

  return false;
}

// =============================================================================
// HELPER: getCalibrationRating
//
// Returns the most honest single rating number for a team to represent their
// season performance. Branches on whether a roster reset occurred:
//
//   No reset  → end-of-season rating (sustained, consistent performance)
//   Reset     → peak rating BEFORE the reset, sustained for MIN_PEAK_GAMES
//               (prevents a roster poach from wiping a region's best signal)
// =============================================================================
function getCalibrationRating(team: RatedTeam): number {
  if (!team.lastResetDate) return team.rating;

  const preResetHistory = team.history.filter(
    (h) => h.date.split(" ")[0] < team.lastResetDate!,
  );

  if (preResetHistory.length === 0) return team.rating;

  // Walk history entries sorted by ELO descending, find highest sustained peak
  const sortedByElo = [...preResetHistory].sort((a, b) => b.elo - a.elo);

  for (const candidate of sortedByElo) {
    const gamesAfterPeak = preResetHistory.filter(
      (h) => h.date >= candidate.date,
    ).length;

    if (gamesAfterPeak >= MIN_PEAK_GAMES) {
      console.log(
        `   ⚡ Reset: ${team.name} | Pre-reset peak: ${Math.round(candidate.elo)} ` +
          `(sustained ${gamesAfterPeak} games) vs final: ${Math.round(team.rating)}`,
      );
      return candidate.elo;
    }
  }

  // No sustained peak found — use the single highest pre-reset entry as fallback
  const fallback = sortedByElo[0]?.elo ?? team.rating;
  console.log(
    `   ⚠️  Reset: ${team.name} | No sustained peak. Using best pre-reset entry: ${Math.round(fallback)}`,
  );
  return fallback;
}

// =============================================================================
// SIGNAL 1: International Ceiling Score
//
// Measures how well this region's teams overperformed or underperformed
// expectations in Major events — the moments where regional dominance
// doesn't shield you.
//
// Uses normalized (actual - expected) per match rather than raw ELO delta.
// This prevents penalizing regions for participating — a team that loses 5
// matches they were always expected to lose scores neutrally, while a team
// that pulls even one real upset scores positively.
//
// Per-match performance is normalized by match count so teams with more
// major appearances aren't unfairly dragged down by sheer volume.
//
// Scale: INTERNATIONAL_SCALE maps the normalized score into ELO points.
//   +1.0 (won every match as a complete underdog) = BASE + SCALE
//    0.0 (met expectations exactly)               = BASE
//   -1.0 (lost every match as heavy favourite)    = BASE - SCALE
// =============================================================================
const INTERNATIONAL_SCALE = 200;

function getInternationalScore(
  entries: { team: RatedTeam; calibrationRating: number }[],
  processedMatches: ProcessedMatch[],
): number {
  let bestNormalizedScore = -Infinity;
  let bestTeamName = "";
  let bestMatchCount = 0;
  let bestMatchDetail = "";

  for (const { team } of entries) {
    const majorMatches = processedMatches.filter(
      (m) =>
        isMajorTournament(m.tournament) &&
        (m.team_a === team.name || m.team_b === team.name),
    );

    if (majorMatches.length === 0) continue;

    let totalPerformance = 0;

    for (const m of majorMatches) {
      const isTeamA = m.team_a === team.name;

      // Actual result: 1 = won, 0 = lost
      const actual = isTeamA
        ? m.score_a > m.score_b
          ? 1
          : 0
        : m.score_b > m.score_a
          ? 1
          : 0;

      // Recover pre-match ratings from stored post-match values
      const preRatingTeam = isTeamA
        ? m.team_a_elo_after - m.elo_change_a
        : m.team_b_elo_after - m.elo_change_b;
      const preRatingOpp = isTeamA
        ? m.team_b_elo_after - m.elo_change_b
        : m.team_a_elo_after - m.elo_change_a;

      // Expected win probability going into the match
      const expectedWinProb =
        1 / (1 + Math.pow(10, (preRatingOpp - preRatingTeam) / 400));

      // (actual - expected): positive = overperformed, negative = underperformed
      totalPerformance += actual - expectedWinProb;
    }

    // Normalize by match count so high-participation teams aren't penalized
    // for having more chances to lose
    const normalizedScore = totalPerformance / majorMatches.length;

    if (normalizedScore > bestNormalizedScore) {
      bestNormalizedScore = normalizedScore;
      bestTeamName = team.name;
      bestMatchCount = majorMatches.length;
      bestMatchDetail = `${totalPerformance > 0 ? "+" : ""}${totalPerformance.toFixed(2)} over ${majorMatches.length} matches`;
    }
  }

  if (bestNormalizedScore === -Infinity) {
    console.log(
      `   ℹ️  No major tournament data found. International score defaults to baseline.`,
    );
    return BASE_BASELINE;
  }

  const internationalScore =
    BASE_BASELINE + bestNormalizedScore * INTERNATIONAL_SCALE;

  console.log(
    `   🌍 International score: ${Math.round(internationalScore)} ` +
      `(best: ${bestTeamName} | normalized: ${bestNormalizedScore > 0 ? "+" : ""}${bestNormalizedScore.toFixed(3)} | ` +
      `raw perf: ${bestMatchDetail})`,
  );

  return internationalScore;
}

// =============================================================================
// SIGNAL 2: Domestic Depth Score
//
// Measures how competitive and evenly matched the region is internally.
// A region with 6 teams clustered between 1300-1400 is deeper than one where
// a single team sits at 1450 and everyone else is at 1220.
//
// Computed as: average calibration rating of ALL qualified teams, minus a
// variance penalty for lopsided distributions.
//
// Safety: only rewards depth if the average is meaningfully above baseline.
// A tight cluster at 1210 is uniform mediocrity, not genuine depth.
// =============================================================================
function getDepthScore(
  entries: { team: RatedTeam; calibrationRating: number }[],
): number {
  if (entries.length === 0) return BASE_BASELINE;

  const ratings = entries.map((e) => e.calibrationRating);
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;

  // Standard deviation — measures how spread out the ratings are
  const variance =
    ratings.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  // Only apply a depth bonus/penalty if the average is above the threshold.
  // Below threshold: return average as-is (no bonus, no extra penalty).
  if (avg <= BASE_BASELINE) {
    console.log(
      `   🏠 Depth score: ${Math.round(avg)} (avg below threshold — no depth bonus applied) | ` +
        `stdDev: ${Math.round(stdDev)}`,
    );
    return avg;
  }

  const variancePenalty = Math.min(
    stdDev * DEPTH_VARIANCE_PENALTY_COEFF,
    DEPTH_VARIANCE_PENALTY_CAP,
  );
  const depthScore = avg - variancePenalty;

  console.log(
    `   🏠 Depth score: ${Math.round(depthScore)} | avg: ${Math.round(avg)} | ` +
      `stdDev: ${Math.round(stdDev)} | variance penalty: -${Math.round(variancePenalty)} ` +
      `(${entries.length} teams)`,
  );

  return depthScore;
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log("🚀 STARTING SEASON CALIBRATION SCRIPT");
  console.log("   Signals: International Ceiling (60%) + Domestic Depth (40%)");
  console.log(
    "====================================================================",
  );

  // 1. Fetch past season match data
  console.log("\n🔄 Fetching Past Season Match Data...");
  const matches = await fetchPastSeasons(API_KEY, "OWCS-Nexus");
  console.log(`✅ Loaded ${matches.length} matches.`);

  // 2. Run the ELO simulation in clean-slate calibration mode.
  //    isCalibration: true forces all teams to start at 1200 regardless of region,
  //    eliminating circular bias from the previous season's STARTING_ELO values.
  console.log(
    "\n🧮 Running Ground Zero ELO Simulation (all teams start at 1200)...",
  );
  const { rankings, processedMatches } = calculateRankings(matches, {
    isStartSeason: true,
    isCalibration: true,
  });

  console.log("\n📋 TOURNAMENTS FETCHED");
  console.log(
    "--------------------------------------------------------------------",
  );
  const fetchedTournaments = [
    ...new Set(matches.map((m: any) => m.tournament)),
  ].sort() as string[];
  if (fetchedTournaments.length === 0) {
    console.log("  ⚠️  No tournaments found. Check fetchPastSeasons().");
  } else {
    fetchedTournaments.forEach((t) => {
      const tag = isMajorTournament(t) ? "🏆 [MAJOR]" : "📌";
      console.log(`  ${tag} ${t}`);
    });
  }
  console.log(
    `  Total: ${fetchedTournaments.length} tournament(s) across ${matches.length} matches`,
  );

  // 4. Group teams by region, computing calibration ratings (peak-aware)
  console.log("\n🌍 GROUPING TEAMS BY REGION");
  console.log(
    "--------------------------------------------------------------------",
  );

  const regionStats: Record<
    string,
    { team: RatedTeam; calibrationRating: number }[]
  > = {
    Korea: [],
    "North America": [],
    EMEA: [],
    China: [],
    Japan: [],
    Pacific: [],
  };

  rankings.forEach((team: RatedTeam) => {
    const totalGames = team.wins + team.losses;
    if (totalGames < MIN_TOTAL_GAMES) return;
    if (team.wins < MIN_WINS) return;

    const calibrationRating = getCalibrationRating(team);
    if (calibrationRating < MIN_RATING_FLOOR) return;

    console.log(
      `  ${team.name} | ${team.region} | Games: ${totalGames} | ` +
        `Final: ${Math.round(team.rating)} | Calibration: ${Math.round(calibrationRating)}`,
    );

    if (regionStats[team.region] !== undefined) {
      regionStats[team.region].push({ team, calibrationRating });
    } else {
      console.log(`  ⚠️  Unclassified: ${team.name} [${team.region}]`);
    }
  });

  // 5. Calculate new baselines combining both signals
  console.log("\n📊 CALCULATING REGIONAL BASELINES");
  console.log(
    "====================================================================",
  );

  const nextSeasonConfig: Record<string, number> = {};

  for (const region of Object.keys(regionStats)) {
    const entries = regionStats[region].sort(
      (a, b) => b.calibrationRating - a.calibrationRating,
    );

    console.log(
      `\n📍 ${region.toUpperCase()} (${entries.length} qualified teams)`,
    );

    if (entries.length === 0) {
      console.log(`   ⚠️  No qualified teams. Defaulting to ${BASE_BASELINE}.`);
      nextSeasonConfig[region] = BASE_BASELINE;
      continue;
    }

    // Log all qualified teams for full transparency
    entries.slice(0, 5).forEach(({ team, calibrationRating }, i) => {
      console.log(
        `   ${i + 1}. ${team.name}: ${Math.round(calibrationRating)}` +
          `${team.lastResetDate ? " (peak-adjusted)" : ""}`,
      );
    });
    if (entries.length > 5) {
      console.log(`   ... and ${entries.length - 5} more`);
    }

    // --- SIGNAL 1: International Ceiling ---
    const internationalScore = getInternationalScore(
      entries,
      processedMatches ?? [],
    );

    // --- SIGNAL 2: Domestic Depth ---
    const depthScore = getDepthScore(entries);

    // --- COMBINE SIGNALS ---
    const combinedScore =
      internationalScore * INTERNATIONAL_WEIGHT + depthScore * DEPTH_WEIGHT;

    // --- SOFT RESET: Compress toward baseline ---
    // New Baseline = 1200 + (deviation from baseline * retention factor)
    const diff = combinedScore - BASE_BASELINE;
    const newBaseline = Math.round(BASE_BASELINE + diff * REGRESSION_FACTOR);

    console.log(
      `\n   📐 Combined: ${Math.round(combinedScore)} ` +
        `(intl ${Math.round(internationalScore)} × ${INTERNATIONAL_WEIGHT} + ` +
        `depth ${Math.round(depthScore)} × ${DEPTH_WEIGHT})`,
    );
    console.log(`   👉 New Baseline: ${newBaseline}`);

    nextSeasonConfig[region] = newBaseline;
  }

  // 6. Output config block ready to paste into calcELO.ts
  console.log("\n\n✅ CALIBRATION COMPLETE");
  console.log(
    "====================================================================",
  );
  console.log("Paste this into calcELO.ts:\n");
  console.log(
    "const STARTING_ELO: Record<string, number> = " +
      JSON.stringify({ ...nextSeasonConfig, default: BASE_BASELINE }, null, 2) +
      ";",
  );
  console.log(
    "====================================================================",
  );
}

main().catch((e) => console.error(e));
