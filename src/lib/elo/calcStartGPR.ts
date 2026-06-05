// =============================================================================
// calcStartGPR.ts — Season Calibration Script
//
// Same two-signal approach as calcStartELO.ts, adapted for the GPR system.
// Outputs REGIONAL_SEEDS to paste into calcGPR.ts at the start of each season.
//
// Signals:
//   1. International Ceiling (60%): best team's over/under-expectation at Majors
//   2. Domestic Depth (40%): average calibration rating minus variance penalty
//
// Run: npx ts-node src/lib/gpr/calcStartGPR.ts
// =============================================================================

import "dotenv/config";
import { calculateGPR } from "./calcGPR";
import { fetchPastSeasons } from "../stats/fetchMatches";
import type { GPRTeam } from "./calcGPR";

const BASE_SEED = 590;
const GPR_SCALE = 1000;
const REGRESSION_FACTOR = 0.6;
const API_KEY = process.env.LIQUIPEDIA_API_KEY;

const MIN_TOTAL_GAMES = 8;
const MIN_WINS = 2;
const MIN_GPR_FLOOR = 300;
const MIN_PEAK_GAMES = 3;

const INTERNATIONAL_WEIGHT = 0.6;
const DEPTH_WEIGHT = 0.4;
const INTERNATIONAL_SCALE = 150;

const DEPTH_VARIANCE_PENALTY_COEFF = 0.3;
const DEPTH_VARIANCE_PENALTY_CAP = 40;

// ── isMajorTournament ────────────────────────────────────────────────────────
// NOTE on "Group Stage": Liquipedia sometimes splits a single Major into
// separate entries e.g. "Midseason Championship" (playoffs) and
// "Midseason Championship Group Stage". Both are part of the same event and
// must both count. So we only block "group stage" when the name does NOT
// also contain a known Major keyword.

const ALWAYS_EXCLUDE_KEYWORDS = [
  "qualifier",
  "last chance",
  "road to",
  "open qualifier",
];

const KNOWN_MAJOR_KEYWORDS = [
  "champions clash",
  "midseason championship",
  "world finals",
  "ewc",
  "esports world cup",
  "major",
  "grand finals",
  "international",
  "global",
  "world cup",
];

function isMajorTournament(name: string): boolean {
  const n = name.toLowerCase();

  // Hard excludes — never a Major regardless of other keywords
  if (ALWAYS_EXCLUDE_KEYWORDS.some((kw) => n.includes(kw))) return false;

  const isMajorEvent = KNOWN_MAJOR_KEYWORDS.some((kw) => n.includes(kw));

  // "group stage" alone = regional. "Midseason Championship Group Stage" = still a Major.
  if (n.includes("group stage") && !isMajorEvent) return false;

  return isMajorEvent;
}

// ── getCalibrationGPR ────────────────────────────────────────────────────────
function getCalibrationGPR(team: GPRTeam): number {
  if (!team.lastRosterRegressionDate) return team.gpr;

  const preResetHistory = team.history.filter(
    (h) => h.date.split(" ")[0] < team.lastRosterRegressionDate!,
  );
  if (preResetHistory.length === 0) return team.gpr;

  const sortedByGPR = [...preResetHistory].sort((a, b) => b.gpr - a.gpr);
  for (const candidate of sortedByGPR) {
    const gamesAfterPeak = preResetHistory.filter((h) =>
      h.date >= candidate.date
    ).length;
    if (gamesAfterPeak >= MIN_PEAK_GAMES) {
      console.log(
        `   ⚡ Reset: ${team.name} | Pre-reset peak: ${
          Math.round(candidate.gpr)
        } ` +
          `(sustained ${gamesAfterPeak} games) vs final: ${
            Math.round(team.gpr)
          }`,
      );
      return candidate.gpr;
    }
  }
  const fallback = sortedByGPR[0]?.gpr ?? team.gpr;
  console.log(
    `   ⚠️  Reset: ${team.name} | No sustained peak. Using best pre-reset: ${
      Math.round(fallback)
    }`,
  );
  return fallback;
}

// ── getInternationalScore ────────────────────────────────────────────────────
function getInternationalScore(
  region: string,
  entries: { team: GPRTeam; calibrationGPR: number }[],
  processedMatches: any[],
): number {
  let bestNormalized = -Infinity;
  let bestTeamName = "";

  // Collect all unique Major tournament names seen in this region's matches
  // so we can log them for debugging
  const majorTournamentsFound = new Set<string>();
  const allTournamentsFound = new Set<string>();

  for (const { team } of entries) {
    const teamMatches = processedMatches.filter(
      (m) => m.team_a === team.name || m.team_b === team.name,
    );

    for (const m of teamMatches) {
      allTournamentsFound.add(m.tournament);
      if (isMajorTournament(m.tournament)) {
        majorTournamentsFound.add(m.tournament);
      }
    }

    const majorMatches = teamMatches.filter((m) =>
      isMajorTournament(m.tournament)
    );

    if (majorMatches.length === 0) continue;

    let totalPerf = 0;
    for (const m of majorMatches) {
      const isTeamA = m.team_a === team.name;
      const actual = isTeamA
        ? m.score_a > m.score_b ? 1 : 0
        : m.score_b > m.score_a
        ? 1
        : 0;

      const preGPRTeam = isTeamA
        ? m.team_a_gpr_after - m.gpr_change_a
        : m.team_b_gpr_after - m.gpr_change_b;
      const preGPROpp = isTeamA
        ? m.team_b_gpr_after - m.gpr_change_b
        : m.team_a_gpr_after - m.gpr_change_a;
      const expectedWin = 1 /
        (1 + Math.pow(10, (preGPROpp - preGPRTeam) / 150));

      totalPerf += actual - expectedWin;
    }

    const normalized = totalPerf / majorMatches.length;

    // Log per-team major match breakdown
    console.log(
      `   📋 ${team.name} | ${majorMatches.length} Major match(es) | ` +
        `perf: ${normalized > 0 ? "+" : ""}${normalized.toFixed(3)} | ` +
        `tournaments: ${
          [...new Set(majorMatches.map((m) => m.tournament))].join(", ")
        }`,
    );

    if (normalized > bestNormalized) {
      bestNormalized = normalized;
      bestTeamName = team.name;
    }
  }

  // Log all tournaments seen for this region's teams — makes alias/detection issues visible
  console.log(`\n   🗂  All tournaments seen for ${region} teams:`);
  const sortedTournaments = Array.from(allTournamentsFound).sort();
  for (const t of sortedTournaments) {
    const isMajor = isMajorTournament(t);
    console.log(`      ${isMajor ? "✅ MAJOR" : "○ reg  "} ${t}`);
  }

  if (bestNormalized === -Infinity) {
    console.log(
      `\n   ℹ️  No major match data found for any ${region} team. International score defaults to baseline.`,
    );
    return BASE_SEED;
  }

  const intlScore = BASE_SEED + bestNormalized * INTERNATIONAL_SCALE;
  console.log(
    `\n   🌍 International score: ${Math.round(intlScore)} ` +
      `(best: ${bestTeamName} | normalized: ${bestNormalized > 0 ? "+" : ""}${
        bestNormalized.toFixed(3)
      })`,
  );
  return intlScore;
}

// ── getDepthScore ────────────────────────────────────────────────────────────
function getDepthScore(
  entries: { team: GPRTeam; calibrationGPR: number }[],
): number {
  if (entries.length === 0) return BASE_SEED;

  const ratings = entries.map((e) => e.calibrationGPR);
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  const variance = ratings.reduce((s, r) => s + Math.pow(r - avg, 2), 0) /
    ratings.length;
  const stdDev = Math.sqrt(variance);

  if (avg <= BASE_SEED) {
    console.log(
      `   🏠 Depth score: ${
        Math.round(avg)
      } (avg below baseline — no bonus) | stdDev: ${Math.round(stdDev)}`,
    );
    return avg;
  }

  const penalty = Math.min(
    stdDev * DEPTH_VARIANCE_PENALTY_COEFF,
    DEPTH_VARIANCE_PENALTY_CAP,
  );
  const depthScore = avg - penalty;
  console.log(
    `   🏠 Depth score: ${Math.round(depthScore)} | avg: ${
      Math.round(avg)
    } | stdDev: ${Math.round(stdDev)} | penalty: -${
      Math.round(penalty)
    } (${entries.length} teams)`,
  );
  return depthScore;
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 STARTING SEASON GPR CALIBRATION");
  console.log("   Signals: International Ceiling (60%) + Domestic Depth (40%)");
  console.log(
    "====================================================================",
  );

  console.log("\n🔄 Fetching Past Season Match Data...");
  const matches = await fetchPastSeasons(API_KEY!, "OWCS-Nexus");
  console.log(`✅ Loaded ${matches.length} matches.`);

  // ── Diagnostic: log all unique Major tournament names found in raw data
  // before alias normalisation — helps catch detection misses like Gatos Guapos
  console.log(
    "\n🔍 MAJOR TOURNAMENT DETECTION (raw Liquipedia names, before alias normalisation)",
  );
  console.log(
    "   (any tournament NOT listed here won't contribute to International scores)",
  );
  const rawTournaments = new Set<string>(matches.map((m: any) => m.tournament));
  const rawMajors: string[] = [];
  const rawNonMajors: string[] = [];
  for (const t of Array.from(rawTournaments).sort()) {
    if (isMajorTournament(t)) rawMajors.push(t);
    else rawNonMajors.push(t);
  }
  console.log(`\n   ✅ Detected as Major (${rawMajors.length}):`);
  rawMajors.forEach((t) => console.log(`      · ${t}`));
  console.log(
    `\n   ○ Detected as Regional/Non-Major (${rawNonMajors.length} — not shown by default)`,
  );
  console.log("   (set VERBOSE=1 to show all non-major tournaments)");
  if (process.env.VERBOSE) {
    rawNonMajors.forEach((t) => console.log(`      · ${t}`));
  }

  // ── Diagnostic: log teams that appear in Major matches under non-aliased names
  // This catches cases like "The Gatos Guapos" appearing at a Major before being
  // aliased to "SHENGSHI", which would make their Major data invisible.
  console.log(
    "\n🔍 ALIAS COVERAGE CHECK (teams in Major matches vs. known aliases)",
  );
  const TEAM_ALIASES: Record<string, string> = {
    "Anyone's Legend": "1234",
    "The Gatos Guapos": "SHENGSHI",
    "Rankers": "Naidorf",
    "Quasar Esports": "Trap12",
    "ONSIDE GAMING": "ZANSIDE GAMING",
  };
  const majorMatchesRaw = matches.filter((m: any) =>
    isMajorTournament(m.tournament)
  );
  const teamsInMajors = new Set<string>();
  for (const m of majorMatchesRaw) {
    if (m.match2opponents?.[0]?.name) {
      teamsInMajors.add(m.match2opponents[0].name);
    }
    if (m.match2opponents?.[1]?.name) {
      teamsInMajors.add(m.match2opponents[1].name);
    }
  }
  const aliasedTeamsInMajors = [...teamsInMajors].filter((name) =>
    TEAM_ALIASES[name]
  );
  if (aliasedTeamsInMajors.length > 0) {
    console.log(
      "   ⚠️  These teams played Majors under a pre-alias name — their data IS captured under the alias:",
    );
    aliasedTeamsInMajors.forEach((name) =>
      console.log(`      · "${name}" → stored as "${TEAM_ALIASES[name]}"`)
    );
  } else {
    console.log(
      "   ✅ No alias conflicts found — all Major participants have current names.",
    );
  }

  console.log(
    "\n🧮 Running Clean-Slate GPR Simulation (all teams start at base seed)...",
  );
  const { rankings, processedMatches } = calculateGPR(matches, {});

  // Group by region
  const regionStats: Record<
    string,
    { team: GPRTeam; calibrationGPR: number }[]
  > = {
    Korea: [],
    "North America": [],
    EMEA: [],
    China: [],
    Japan: [],
    Pacific: [],
  };

  console.log("\n🌍 GROUPING TEAMS BY REGION");
  rankings.forEach((team: GPRTeam) => {
    const totalGames = team.wins + team.losses;
    if (totalGames < MIN_TOTAL_GAMES || team.wins < MIN_WINS) return;
    const calGPR = getCalibrationGPR(team);
    if (calGPR < MIN_GPR_FLOOR) return;
    console.log(
      `  ${team.name} | ${team.region} | Games: ${totalGames} | GPR: ${
        Math.round(team.gpr)
      } | CalGPR: ${Math.round(calGPR)}`,
    );
    if (team.region && regionStats[team.region] !== undefined) {
      regionStats[team.region].push({ team, calibrationGPR: calGPR });
    }
  });

  console.log("\n📊 CALCULATING REGIONAL SEEDS");
  console.log(
    "====================================================================",
  );
  const nextConfig: Record<string, number> = {};

  for (const region of Object.keys(regionStats)) {
    const entries = regionStats[region].sort((a, b) =>
      b.calibrationGPR - a.calibrationGPR
    );
    console.log(
      `\n📍 ${region.toUpperCase()} (${entries.length} qualified teams)`,
    );

    if (entries.length === 0) {
      console.log(`   ⚠️  No qualified teams. Defaulting to ${BASE_SEED}.`);
      nextConfig[region] = BASE_SEED;
      continue;
    }

    entries.slice(0, 5).forEach(({ team, calibrationGPR }, i) => {
      console.log(
        `   ${i + 1}. ${team.name}: ${Math.round(calibrationGPR)}${
          team.lastRosterRegressionDate ? " (peak-adjusted)" : ""
        }`,
      );
    });

    console.log("");
    const intlScore = getInternationalScore(
      region,
      entries,
      processedMatches ?? [],
    );
    const depthScore = getDepthScore(entries);
    const combined = intlScore * INTERNATIONAL_WEIGHT +
      depthScore * DEPTH_WEIGHT;
    const diff = combined - BASE_SEED;
    const newSeed = Math.round(BASE_SEED + diff * REGRESSION_FACTOR);

    console.log(
      `\n   📐 Combined: ${Math.round(combined)} (intl ${
        Math.round(intlScore)
      } × ${INTERNATIONAL_WEIGHT} + depth ${
        Math.round(depthScore)
      } × ${DEPTH_WEIGHT})`,
    );
    console.log(`   👉 New Seed: ${newSeed}`);
    nextConfig[region] = newSeed;
  }

  console.log("\n\n✅ CALIBRATION COMPLETE");
  console.log(
    "====================================================================",
  );
  console.log("Paste this into calcGPR.ts:\n");
  console.log(
    "const REGIONAL_SEEDS: Record<string, number> = " +
      JSON.stringify({ ...nextConfig, default: BASE_SEED }, null, 2) + ";",
  );
  console.log(
    "====================================================================",
  );
}

main().catch((e) => console.error(e));
