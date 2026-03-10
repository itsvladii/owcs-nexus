// src/pages/api/live-now.ts
export const prerender = false; // Dynamic Route

import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.LIQUIPEDIA_API_KEY;
  const userAgent = "OWCS-Nexus";

  // --- THE OPTIMIZATION FIX ---
  // 1. &w=100: Cap width at 100px (ticker logos are tiny)
  // 2. &we: Output as WebP for superior compression
  // 3. &il: Interlaced/Progressive loading
  const getLogo = (url: string) =>
    url ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=100&we&il` : null;
  // -----------------------------

  const dateObj = new Date();
  const now = dateObj.toISOString().slice(0, 19).replace("T", " ");
  const yesterdayObj = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = yesterdayObj.toISOString().slice(0, 19).replace("T", " ");

  function shortenTournamentName(name: string): string {
    if (!name) return "";
    let shortName = name;
    shortName = shortName.replace(/Overwatch Champions Series/g, "OWCS");
    shortName = shortName.replace(/Overwatch League/g, "OWL");
    shortName = shortName.replace(/Overwatch Contenders/g, "Contenders");
    shortName = shortName.replace(/ 20(\d\d)/g, " '$1");
    shortName = shortName.replace(/Season (\d)/g, "S$1");
    shortName = shortName.replace(/North America/g, "NA");
    shortName = shortName.replace(/Europe, Middle East & Africa/g, "EMEA");
    shortName = shortName.replace(/South Korea/g, "Korea");
    return shortName.trim();
  }

  function getStreamUrl(tournament: string): string {
    const t = (tournament || "").toLowerCase();

    // China — streams on Bilibili
    if (t.includes("china") || t.includes("chinese"))
      return "https://space.bilibili.com/365902357";

    // Korea — streams on SOOP
    if (t.includes("korea") || t.includes("south korea"))
      return "https://www.sooplive.co.kr/station/owesports";

    // Pacific streams on SOOP
    if (t.includes("pacific")) return "https://www.sooplive.com/wdgglobal";

    // Japan streams on their own Twitch channel
    if (t.includes("japan")) return "https://www.twitch.tv/ow_esports_jp";

    //NA and EMEA stream on the main OWCS channel on Twitch
    return "https://twitch.tv/ow_esports";
  }

  try {
    const endpoint = new URL("https://api.liquipedia.net/api/v3/match");
    endpoint.searchParams.set("wiki", "overwatch");
    endpoint.searchParams.set("order", "date DESC");

    endpoint.searchParams.set(
      "conditions",
      `[[finished::0]] AND [[date::<${now}]] AND [[date::>${yesterday}]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]])`,
    );

    const response = await fetch(endpoint.toString(), {
      headers: { Authorization: `Apikey ${apiKey}`, "User-Agent": userAgent },
    });

    const data = await response.json();

    if (!data.result || data.result.length === 0) {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=30" }, // Cache empty state for 30s
      });
    }

    const match = data.result[0];
    const op1 = match.match2opponents[0];
    const op2 = match.match2opponents[1];

    const payload = {
      tournament: shortenTournamentName(match.tournament),
      teamA: {
        name: op1.name,
        logo: getLogo(op1.teamtemplate?.imageurl || op1.iconurl),
        score: op1.score ?? 0,
      },
      teamB: {
        name: op2.name,
        logo: getLogo(op2.teamtemplate?.imageurl || op2.iconurl),
        score: op2.score ?? 0,
      },
      stream: getStreamUrl(match.tournament),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // --- PROXY CACHE: Protect your API Key ---
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify(null), { status: 500 });
  }
};
