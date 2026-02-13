import 'dotenv/config'; 
import { calculateRankings } from './calcELO'; 
import { fetchAllSeasonMatches } from '../stats/fetchMatches'; // Ensure this path is correct

const BASE_BASELINE = 1200;
const REGRESSION_FACTOR = 0.7; // 50% Soft Reset (Squish towards 1200)
const MIN_GAMES_PLAYED = 5; // Ignore teams that played fewer than 5 games
const API_KEY = process.env.LIQUIPEDIA_API_KEY;

async function main() {
  console.log("🚀 STARTING SEASON CALIBRATION SCRIPT");
  console.log("==================================================");

  // 1. Fetch Data
  console.log("\n🔄 Fetching 2025 Match Data...");
  const matches = await fetchAllSeasonMatches(API_KEY,"OWCS-Nexus (barcanvladi@gmail.com)");
  console.log(`✅ Loaded ${matches.length} matches.`);

  // 2. Run the Algorithm
  console.log("🧮 Running ELO Simulation...");
  const { rankings } = calculateRankings(matches);

  // 3. Group Teams by Region
  console.log("\n🌍 ANALYZING REGIONAL STRENGTH");
  console.log("--------------------------------------------------");

  const regionStats: Record<string, any[]> = {
    'Korea': [],
    'North America': [],
    'EMEA': [],
    'China': [],
    'Japan': [],
    'Pacific': []
  };

  // Sort teams into buckets
  rankings.forEach((team: any) => {
    // Filter out inactive/casual teams
    const totalGames = team.wins + team.losses;
    if (totalGames < MIN_GAMES_PLAYED) return;
    if (team.rating < 1000) return; // Filter out really bad teams to avoid skewing

    // Normalize Region Name
    let r = team.region;
    if (r === 'NA') r = 'North America';
    if (r === 'Europe') r = 'EMEA';
    
    if (regionStats[r]) {
        regionStats[r].push(team);
    }
  });

  // 4. Calculate New Baselines
  const nextSeasonConfig: Record<string, number> = {};

  for (const region of Object.keys(regionStats)) {
      // Sort by rating (High to Low)
      const teams = regionStats[region].sort((a, b) => b.rating - a.rating);
      
      console.log(`\n📍 ${region.toUpperCase()} (${teams.length} teams qualified)`);
      
      // We use the Top 3 teams to define the "Ceiling" of the region
      const topTeams = teams.slice(0, 3);
      
      if (topTeams.length > 0) {
          // Print who is defining the region
          topTeams.forEach((t, i) => console.log(`   ${i+1}. ${t.name}: ${Math.round(t.rating)}`));

          // Calculate Average of Top 3
          const avgTopElo = topTeams.reduce((sum, t) => sum + t.rating, 0) / topTeams.length;
          
          // Apply Soft Reset Formula
          // New = 1200 + (Diff / 2)
          const diff = avgTopElo - BASE_BASELINE;
          const newBaseline = Math.round(BASE_BASELINE + (diff * REGRESSION_FACTOR));
          
          console.log(`   👉 Raw Avg: ${Math.round(avgTopElo)} | New Baseline: ${newBaseline}`);
          nextSeasonConfig[region] = newBaseline;
      } else {
          console.log(`   ⚠️ No qualified teams found. Defaulting to 1200.`);
          nextSeasonConfig[region] = 1200;
      }
  }

  // 5. Output the Config
  console.log("\n\n✅ CALIBRATION COMPLETE");
  console.log("==================================================");
  console.log("Copy this object into 'src/lib/elo/calcELO.ts':\n");
  
  const output = {
      ...nextSeasonConfig,
      'default': 1200
  };
  
  console.log(`const STARTING_ELO: Record<string, number> = ${JSON.stringify(output, null, 2)};`);
  console.log("==================================================");
}

main().catch(e => console.error(e));