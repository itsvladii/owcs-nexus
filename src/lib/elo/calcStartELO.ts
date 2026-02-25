import 'dotenv/config'; 
import { calculateRankings} from './calcELO'; 
import { fetchAllSeasonMatches, fetchPastSeasons } from '../stats/fetchMatches';

const BASE_BASELINE = 1200;
// Using the retention coefficient from your core algorithm for consistency
const REGRESSION_FACTOR = 0.6;
const API_KEY = process.env.LIQUIPEDIA_API_KEY;

async function main() {
  console.log("🚀 STARTING SEASON CALIBRATION SCRIPT (CLEAN SLATE)");
  console.log("==================================================");

  // 1. Fetch Data
  console.log("\n🔄 Fetching 2025 Match Data...");
  const matches = await fetchPastSeasons(API_KEY, "OWCS-Nexus (barcanvladi@gmail.com)");
  console.log(`✅ Loaded ${matches.length} matches.`);

  // 2. Run the Algorithm in Calibration Mode
  // ⚡ This forces all teams to start at 1200 regardless of region
  console.log("🧮 Running Ground Zero ELO Simulation...");
  const { rankings } = calculateRankings(matches,{isStartSeason:true});

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

  rankings.forEach((team: any) => {
    const totalGames = team.wins + team.losses;
    // We only consider established teams to avoid ELO noise
   if (totalGames < 8) return; 
   if (team.wins < 2) return;
    // Existing rating safety floor
    if (team.rating < 1000) return;
    console.log(`Team: ${team.name} | Region: ${team.region} | Games: ${totalGames}`);

    let r = team.region;
    
    if (regionStats[r]) {
        regionStats[r].push(team);
    }else {
        // Fallback for unclassified teams to see where they are going
        console.log(`Unclassified: ${team.name} has region [${r}]`);
    }
  });

  // 4. Calculate New Baselines with Weighted Averaging
  const nextSeasonConfig: Record<string, number> = {};

  for (const region of Object.keys(regionStats)) {
      const teams = regionStats[region].sort((a, b) => b.rating - a.rating);
      
      console.log(`\n📍 ${region.toUpperCase()} (${teams.length} teams qualified)`);
      
      // We use the Top 3 to define the region's competitive ceiling
      const topTeams = teams.slice(0, 3);
      
      if (topTeams.length > 0) {
          // ⚡ WEIGHTED AVERAGE LOGIC
          // This ensures a single dominant team doesn't skew the whole region
          const weights = [0.5, 0.3, 0.2]; // 50% for #1, 30% for #2, 20% for #3
          let weightedSum = 0;
          let totalWeightUsed = 0;

          topTeams.forEach((t, i) => {
              const w = weights[i] || 0;
              weightedSum += t.rating * w;
              totalWeightUsed += w;
              console.log(`   ${i+1}. ${t.name}: ${Math.round(t.rating)} (Weight: ${w * 100}%)`);
          });

          const weightedAvgElo = weightedSum / totalWeightUsed;
          
          // Apply Soft Reset Formula
          // New Baseline = Baseline + (Deviation * Retention)
          const diff = weightedAvgElo - BASE_BASELINE;
          const newBaseline = Math.round(BASE_BASELINE + (diff * REGRESSION_FACTOR));
          
          console.log(`   👉 Weighted Avg: ${Math.round(weightedAvgElo)} | New Baseline: ${newBaseline}`);
          nextSeasonConfig[region] = newBaseline;
      } else {
          console.log(`   ⚠️ No qualified teams. Defaulting to 1200.`);
          nextSeasonConfig[region] = 1200;
      }
  }

  // 5. Output the Config
  console.log("\n\n✅ CALIBRATION COMPLETE");
  console.log("==================================================");
  console.log("const STARTING_ELO: Record<string, number> = " + JSON.stringify({
      ...nextSeasonConfig,
      'default': 1200
  }, null, 2) + ";");
  console.log("==================================================");
}

main().catch(e => console.error(e));