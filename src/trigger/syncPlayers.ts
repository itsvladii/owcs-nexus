import { schedules, logger } from "@trigger.dev/sdk/v3";
import { runSyncPlayers } from "../lib/stats/syncPlayers";

// ── Sync players every 6 hours ──
export const syncPlayersTask = schedules.task({
  id: "sync-players-rosters",
  cron: "0 */6 * * *",

  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 60_000,
  },

  run: async () => {
    logger.info("Starting player and roster sync...");

    try {
      const result = await runSyncPlayers();
      logger.info("Player sync complete ✓", result);
      return result;
    } catch (error: any) {
      logger.error("Player sync failed", { error: error.message });
      throw error;
    }
  },
});
