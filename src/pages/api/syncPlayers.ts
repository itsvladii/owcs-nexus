import type { APIRoute } from "astro";
import { runSyncPlayers } from "../../lib/stats/syncPlayers";

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = import.meta.env?.CRON_SECRET || process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
    });
  }

  try {
    const result = await runSyncPlayers();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
    });
  }
};
