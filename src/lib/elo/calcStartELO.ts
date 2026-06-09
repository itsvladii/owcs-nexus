// =============================================================================
// calcStartELO.ts — Season Calibration Script
//
// Simulates the past season from scratch (all teams start at 1200) then
// derives next season's STARTING_ELO per region from two signals:
//
//   Signal 1 · International Ceiling (60%): best team's over/under-expectation at Majors
//   Signal 2 · Domestic Depth       (40%): average calibration rating minus variance penalty
//
// Run: npx ts-node src/lib/elo/calcStartELO.ts
// =============================================================================

import "dotenv/config";
import { calculateRankings } from "./calcELO.ts";
import { fetchPastSeasons } from "../stats/fetchMatches.ts";
import type { ProcessedMatch, RatedTeam } from "./calcELO.ts";

// ── Config ───────────────────────────────────────────────────────────────────
const BASE_BASELINE = 1200;
const REGRESSION_FACTOR = 0.6;
const API_KEY = process.env.LIQUIPEDIA_API_KEY;
const MIN_TOTAL_GAMES = 8;
const MIN_WINS = 2;
const MIN_RATING_FLOOR = 800; // Lower floor — calibration starts at 1200, not season seeds
const MIN_PEAK_GAMES = 3;
const INTERNATIONAL_WEIGHT = 0.6;
const DEPTH_WEIGHT = 0.4;
const INTERNATIONAL_SCALE = 200;
const DEPTH_VARIANCE_PENALTY = 0.3;
const DEPTH_VARIANCE_CAP = 50;

// ── isMajorTournament ─────────────────────────────────────────────────────────
const ALWAYS_EXCLUDE = [
  "qualifier",
  "last chance",
  "road to",
  "open qualifier",
];
const MAJOR_KEYWORDS = [
  "champions clash",
  "midseason championship",
  "world finals",
  "ewc",
  "esports world cup",
  "major",
  "grand finals",
];

function isMajorTournament(name: string): boolean {
  const n = name.toLowerCase();
  if (ALWAYS_EXCLUDE.some((kw) => n.includes(kw))) return false;
  const isMajor = MAJOR_KEYWORDS.some((kw) => n.includes(kw));
  if (n.includes("group stage") && !isMajor) return false;
  return isMajor;
}

// ── getCalibrationRating ──────────────────────────────────────────────────────
// Returns peak pre-reset rating if a roster overhaul occurred, else end-of-season rating.
function getCalibrationRating(team: RatedTeam): number {
  if (!team.lastResetDate) return team.rating;
  const pre = team.history.filter((h) =>
    h.date.split(" ")[0] < team.lastResetDate!
  );
  if (pre.length === 0) return team.rating;
  const sorted = [...pre].sort((a, b) => b.elo - a.elo);
  for (const candidate of sorted) {
    if (pre.filter((h) => h.date >= candidate.date).length >= MIN_PEAK_GAMES) {
      console.log(
        `   ⚡ ${team.name} | pre-reset peak: ${Math.round(candidate.elo)}`,
      );
      return candidate.elo;
    }
  }
  const fallback = sorted[0]?.elo ?? team.rating;
  console.log(
    `   ⚠️  ${team.name} | no sustained peak, using best: ${
      Math.round(fallback)
    }`,
  );
  return fallback;
}

// ── getInternationalScore ─────────────────────────────────────────────────────
function getInternationalScore(
  region: string,
  entries: { team: RatedTeam; calibrationRating: number }[],
  processedMatches: ProcessedMatch[],
): number {
  let bestNorm = -Infinity;
  let bestTeam = "";

  const allTournaments = new Set<string>();

  for (const { team } of entries) {
    const teamMatches = processedMatches.filter(
      (m) => m.team_a === team.name || m.team_b === team.name,
    );
    teamMatches.forEach((m) => allTournaments.add(m.tournament));

    const majorMatches = teamMatches.filter((m) =>
      isMajorTournament(m.tournament)
    );
    if (majorMatches.length === 0) continue;

    let totalPerf = 0;
    for (const m of majorMatches) {
      const isTeamA = m.team_a === team.name;
      const actual = isTeamA
        ? (m.score_a > m.score_b ? 1 : 0)
        : (m.score_b > m.score_a ? 1 : 0);
      const preTeam = isTeamA
        ? m.team_a_elo_after - m.elo_change_a
        : m.team_b_elo_after - m.elo_change_b;
      const preOpp = isTeamA
        ? m.team_b_elo_after - m.elo_change_b
        : m.team_a_elo_after - m.elo_change_a;
      const expected = 1 / (1 + Math.pow(10, (preOpp - preTeam) / 400));
      totalPerf += actual - expected;
    }

    const norm = totalPerf / majorMatches.length;
    console.log(
      `   📋 ${team.name} | ${majorMatches.length} major match(es) | perf: ${
        norm > 0 ? "+" : ""
      }${norm.toFixed(3)}`,
    );

    if (norm > bestNorm) {
      bestNorm = norm;
      bestTeam = team.name;
    }
  }

  // Log tournament breakdown for this region
  console.log(`\n   🗂  Tournaments seen for ${region}:`);
  const OTHER_REGIONS: Record<string, string[]> = {
    "Korea": ["emea", "north america", "china", "japan", "pacific"],
    "North America": ["emea", "korea", "china", "japan", "pacific"],
    "EMEA": ["north america", "korea", "china", "japan", "pacific"],
    "China": ["emea", "north america", "korea", "japan", "pacific"],
    "Japan": ["emea", "north america", "korea", "china", "pacific"],
    "Pacific": ["emea", "north america", "korea", "china", "japan"],
  };
  for (const t of Array.from(allTournaments).sort()) {
    const isMajor = isMajorTournament(t);
    const isCross = !isMajor &&
      (OTHER_REGIONS[region] ?? []).some((r) => t.toLowerCase().includes(r));
    const prefix = isMajor ? "✅ MAJOR" : isCross ? "↔ cross " : "○ reg  ";
    const suffix = isCross ? "  ← cross-region (counts normally)" : "";
    console.log(`      ${prefix} ${t}${suffix}`);
  }

  if (bestNorm === -Infinity) {
    console.log(
      `\n   ℹ️  No major data — international score defaults to baseline`,
    );
    return BASE_BASELINE;
  }

  const score = BASE_BASELINE + bestNorm * INTERNATIONAL_SCALE;
  console.log(
    `\n   🌍 International score: ${
      Math.round(score)
    } (best: ${bestTeam} | norm: ${bestNorm > 0 ? "+" : ""}${
      bestNorm.toFixed(3)
    })`,
  );
  return score;
}

// ── getDepthScore ─────────────────────────────────────────────────────────────
function getDepthScore(
  entries: { team: RatedTeam; calibrationRating: number }[],
): number {
  if (entries.length === 0) return BASE_BASELINE;
  const ratings = entries.map((e) => e.calibrationRating);
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  const stdDev = Math.sqrt(
    ratings.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / ratings.length,
  );
  if (avg <= BASE_BASELINE) {
    console.log(
      `   🏠 Depth: ${Math.round(avg)} (below baseline, no bonus) | stdDev: ${
        Math.round(stdDev)
      }`,
    );
    return avg;
  }
  const penalty = Math.min(stdDev * DEPTH_VARIANCE_PENALTY, DEPTH_VARIANCE_CAP);
  console.log(
    `   🏠 Depth: ${Math.round(avg - penalty)} | avg: ${
      Math.round(avg)
    } | stdDev: ${Math.round(stdDev)} | penalty: -${Math.round(penalty)}`,
  );
  return avg - penalty;
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 SEASON ELO CALIBRATION");
  console.log("   International Ceiling (60%) + Domestic Depth (40%)");
  console.log("=".repeat(68));

  console.log("\n🔄 Fetching past season data...");
  const matches = await fetchPastSeasons(API_KEY!, "OWCS-Nexus");
  console.log(`✅ ${matches.length} matches loaded`);

  // ── Major detection upfront ───────────────────────────────────────────────
  const rawTournaments = [
    ...new Set<string>(matches.map((m: any) => m.tournament)),
  ].sort();
  const detectedMajors = rawTournaments.filter(isMajorTournament);
  console.log(`\n🔍 Detected ${detectedMajors.length} Major tournament(s):`);
  detectedMajors.forEach((t) => console.log(`   · ${t}`));

  // ── Alias coverage check ──────────────────────────────────────────────────
  const TEAM_ALIASES: Record<string, string> = {
    "Anyone's Legend": "1234",
    "The Gatos Guapos": "SHENGSHI",
    "Rankers": "Naidorf",
    "Quasar Esports": "Trap12",
    "ONSIDE GAMING": "ZANSIDE GAMING",
  };
  const majorParticipants = new Set<string>();
  matches
    .filter((m: any) => isMajorTournament(m.tournament))
    .forEach((m: any) => {
      if (m.match2opponents?.[0]?.name) {
        majorParticipants.add(m.match2opponents[0].name);
      }
      if (m.match2opponents?.[1]?.name) {
        majorParticipants.add(m.match2opponents[1].name);
      }
    });
  const aliasedInMajors = [...majorParticipants].filter((n) => TEAM_ALIASES[n]);
  if (aliasedInMajors.length > 0) {
    console.log(
      "\n⚠️  Pre-alias names found in Majors (data captured under alias):",
    );
    aliasedInMajors.forEach((n) =>
      console.log(`   · "${n}" → "${TEAM_ALIASES[n]}"`)
    );
  } else {
    console.log("\n✅ No alias conflicts in Major matches");
  }

  // ── Simulate ──────────────────────────────────────────────────────────────
  console.log("\n🧮 Simulating season (all teams start at 1200)...");
  // Use allTeams (unfiltered) — calibration needs every team regardless of inactivity/floor
  const { allTeams: rankings, processedMatches } = calculateRankings(matches, {
    isCalibration: true,
  });

  // ── Group by region ───────────────────────────────────────────────────────
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

  console.log("\n🌍 Qualified teams by region:");
  rankings.forEach((team) => {
    const total = team.wins + team.losses;
    if (total < MIN_TOTAL_GAMES || team.wins < MIN_WINS) return;
    const cal = getCalibrationRating(team);
    if (cal < MIN_RATING_FLOOR) return;
    console.log(
      `   ${team.name} | ${team.region} | ${total} games | rating: ${
        Math.round(team.rating)
      } | cal: ${Math.round(cal)}`,
    );
    if (team.region && regionStats[team.region] !== undefined) {
      regionStats[team.region].push({ team, calibrationRating: cal });
    }
  });

  // ── Calculate seeds ───────────────────────────────────────────────────────
  console.log("\n📊 REGIONAL SEED CALCULATION");
  console.log("=".repeat(68));

  const result: Record<string, number> = {};

  for (const region of Object.keys(regionStats)) {
    const entries = regionStats[region].sort((a, b) =>
      b.calibrationRating - a.calibrationRating
    );
    console.log(
      `\n📍 ${region.toUpperCase()} (${entries.length} qualified teams)`,
    );

    if (entries.length === 0) {
      console.log(`   ⚠️  No qualified teams — defaulting to ${BASE_BASELINE}`);
      result[region] = BASE_BASELINE;
      continue;
    }

    entries.slice(0, 5).forEach(({ team, calibrationRating }, i) =>
      console.log(
        `   ${i + 1}. ${team.name}: ${Math.round(calibrationRating)}${
          team.lastResetDate ? " (peak-adjusted)" : ""
        }`,
      )
    );

    console.log("");
    const intl = getInternationalScore(region, entries, processedMatches ?? []);
    const depth = getDepthScore(entries);
    const combined = intl * INTERNATIONAL_WEIGHT + depth * DEPTH_WEIGHT;
    const seed = Math.round(
      BASE_BASELINE + (combined - BASE_BASELINE) * REGRESSION_FACTOR,
    );

    console.log(
      `\n   📐 Combined: ${Math.round(combined)} (intl ${
        Math.round(intl)
      } × ${INTERNATIONAL_WEIGHT} + depth ${
        Math.round(depth)
      } × ${DEPTH_WEIGHT})`,
    );
    console.log(`   👉 New seed: ${seed}`);
    result[region] = seed;
  }

  console.log("\n\n✅ CALIBRATION COMPLETE");
  console.log("=".repeat(68));
  console.log("Paste into calcELO.ts:\n");
  console.log(
    "const STARTING_ELO: Record<string, number> = " +
      JSON.stringify({ ...result, default: BASE_BASELINE }, null, 2) + ";",
  );
  console.log("=".repeat(68));
}

main().catch((e) => console.error(e));
