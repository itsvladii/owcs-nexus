import "dotenv/config";
import { runSyncPlayers } from "./src/lib/stats/syncPlayers";

async function main() {
  console.log("🚀 Starting manual player and roster sync...");
  try {
    const result = await runSyncPlayers();
    console.log("✅ Sync successful!");
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error("❌ Sync failed:", error.message);
    process.exit(1);
  }
}

main();
