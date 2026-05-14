// 1. Define the interfaces
// We need a flexible type because the API returns complex nested JSON
export interface Match {
  teamLeft: string;
  scoreLeft: string | number;
  teamRight: string;
  scoreRight: string | number;
  tournament: string;
  date: string;
  // These fields are crucial for the ELO calculator & Logos
  match2opponents?: {
    opponents: {
      name: string;
      icon: string;
      iconurl: string; // <--- This is the logo URL we need!
      score: number;
    }[];
  };
  winner?: string;
}

// Post-fetch filter — removes open qualifiers and non-competitive matches
// that Liquipedia's API doesn't let us exclude via conditions syntax
function filterQualifiers(matches: any[]): any[] {
  const EXCLUDE_KEYWORDS = [
    "qualifier",
    "open qualifier",
    "showmatch",
    "exhibition",
  ];

  const filtered = matches.filter((match: any) => {
    const t = (match.tournament ?? "").toLowerCase();
    return !EXCLUDE_KEYWORDS.some((kw) => t.includes(kw));
  });

  if (filtered.length !== matches.length) {
    console.log(
      `[Liquipedia] Filtered out ${matches.length - filtered.length} qualifier/non-competitive matches (${filtered.length} remaining)`,
    );
  }

  return filtered;
}

// 3. Fetch Season Matches (For Global Power Rankings)
export async function fetchAllSeasonMatches(
  apiKey: string,
  userAgent: string,
  since?: string,
) {
  if (!apiKey) return [];
  // Use the provided `since` date if doing an incremental sync, otherwise fall
  // back to the season start date.
  const afterDate = since ?? "2026-03-15";
  try {
    const endpoint = new URL("https://api.liquipedia.net/api/v3/match");
    endpoint.searchParams.set("wiki", "overwatch");
    endpoint.searchParams.set("limit", "1000");
    endpoint.searchParams.set("order", "date ASC");
    endpoint.searchParams.set(
      "conditions",
      `[[finished::1]] AND [[date::>${afterDate}]] AND ([[liquipediatier::1]] OR [[liquipediatier::2]]) AND ([[series::Overwatch Champions Series]] OR [[series::Esports World Cup]])`,
    );
    console.log(`[Liquipedia] Fetching season matches since ${afterDate}...`);
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Authorization: `Apikey ${apiKey}`,
        Accept: "application/json",
        "User-Agent": userAgent,
      },
    });
    if (response.ok) {
      const data = await response.json();
      let resultsArray: any[] = [];
      if (Array.isArray(data.result)) {
        resultsArray = data.result;
      } else if (data.result && typeof data.result === "object") {
        resultsArray = Object.values(data.result);
      }
      console.log(
        `[Liquipedia] Successfully fetched ${resultsArray.length} matches for rankings.`,
      );
      return filterQualifiers(resultsArray);
    } else {
      console.warn(
        `Liquipedia Ranking API error: ${response.status} ${response.statusText}`,
      );
      return [];
    }
  } catch (e) {
    console.error("Error fetching season matches:", e);
    return [];
  }
}

export async function fetchPastSeasons(apiKey: string, userAgent: string) {
  if (!apiKey) return [];
  try {
    const endpoint = new URL("https://api.liquipedia.net/api/v3/match");
    endpoint.searchParams.set("wiki", "overwatch");
    endpoint.searchParams.set("limit", "1000");
    endpoint.searchParams.set("order", "date ASC");
    endpoint.searchParams.set(
      "conditions",
      "[[finished::1]] AND ([[date::>2025-01-23]] AND [[date::<2025-12-01]])  AND ([[liquipediatier::1]] OR [[liquipediatier::2]]) AND ([[series::Overwatch Champions Series]] OR [[series::Esports World Cup]])",
    );
    console.log(`[Liquipedia] Fetching season matches...`);
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Authorization: `Apikey ${apiKey}`,
        Accept: "application/json",
        "User-Agent": userAgent,
      },
    });
    if (response.ok) {
      const data = await response.json();
      let resultsArray: any[] = [];
      if (Array.isArray(data.result)) {
        resultsArray = data.result;
      } else if (data.result && typeof data.result === "object") {
        resultsArray = Object.values(data.result);
      }
      console.log(
        `[Liquipedia] Successfully fetched ${resultsArray.length} matches for rankings.`,
      );
      return filterQualifiers(resultsArray);
    } else {
      console.warn(
        `Liquipedia Ranking API error: ${response.status} ${response.statusText}`,
      );
      return [];
    }
  } catch (e) {
    console.error("Error fetching season matches:", e);
    return [];
  }
}
