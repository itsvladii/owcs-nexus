// src/pages/api/og.png.ts
export const prerender = false;
import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY,
);

const REGION_COLORS: Record<string, string> = {
  Korea: "#6eff18",
  "North America": "#823bf2",
  EMEA: "#d4e800",
  Pacific: "#00c8ff",
  China: "#ff6a00",
  Japan: "#ec0201",
};

async function fetchLogoBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mime = res.headers.get("content-type") ?? "image/png";
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const GET: APIRoute = async () => {
  try {
    // ── Fetch data ──────────────────────────────────────────────────────────
    const [{ data: rankings }, { count: matchCount }, { data: globalStats }] =
      await Promise.all([
        supabase
          .from("rankings")
          .select("name, rating, region, logo, logo_dark, wins, losses")
          .order("rating", { ascending: false })
          .limit(10),
        supabase
          .from("processed_matches")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("global_stats")
          .select("last_synced_at")
          .limit(1)
          .single(),
      ]);

    if (!rankings || rankings.length === 0) {
      return new Response("No data", { status: 503 });
    }

    // ── Derived stats ───────────────────────────────────────────────────────
    const regionSet = new Set(rankings.map((t) => t.region));
    const regionCount = regionSet.size;
    const totalMatches = matchCount ?? 0;
    const lastUpdated = globalStats?.last_synced_at
      ? timeAgo(new Date(globalStats.last_synced_at))
      : "unknown";

    // ── Fetch logos as base64 ───────────────────────────────────────────────
    const teams = await Promise.all(
      rankings.map(async (t, i) => ({
        ...t,
        rank: i + 1,
        logoB64: t.logo_dark ? await fetchLogoBase64(t.logo_dark) : null,
        color: REGION_COLORS[t.region] ?? "#a855f7",
        rating: Math.round(t.rating),
      })),
    );

    // ── Load fonts ──────────────────────────────────────────────────────────
    const fontBold = readFileSync(resolve("public/fonts/Inter-Bold.ttf"));
    const fontBlack = readFileSync(resolve("public/fonts/Inter-Black.ttf"));

    const fonts = [
      {
        name: "Inter",
        data: fontBold,
        weight: 700 as const,
        style: "normal" as const,
      },
      {
        name: "Inter",
        data: fontBlack,
        weight: 900 as const,
        style: "normal" as const,
      },
    ];

    const W = 800;
    const H = 1200;

    // ── Rank row ────────────────────────────────────────────────────────────
    const rankRow = (team: (typeof teams)[0], isTop3: boolean) => ({
      type: "div",
      props: {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: isTop3 ? "16px 24px" : "12px 24px",
          background: isTop3
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.02)",
          borderRadius: 14,
          borderLeft: `3px solid ${team.color}`,
        },
        children: [
          // Rank number
          {
            type: "span",
            props: {
              style: {
                fontSize: isTop3 ? 20 : 14,
                fontWeight: 900,
                color: team.rank <= 3 ? "#fff" : "#2a2a2a",
                width: 28,
                textAlign: "right" as const,
              },
              children: `${team.rank}`,
            },
          },
          // Logo
          team.logoB64
            ? {
                type: "img",
                props: {
                  src: team.logoB64,
                  width: isTop3 ? 48 : 36,
                  height: isTop3 ? 48 : 36,
                  style: { objectFit: "contain" as const },
                },
              }
            : {
                type: "div",
                props: {
                  style: {
                    width: isTop3 ? 48 : 36,
                    height: isTop3 ? 48 : 36,
                    background: "#1a1a1a",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          fontSize: 10,
                          fontWeight: 900,
                          color: team.color,
                        },
                        children: team.name.slice(0, 2).toUpperCase(),
                      },
                    },
                  ],
                },
              },
          // Name + region
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column" as const,
                flex: 1,
                gap: 2,
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: isTop3 ? 18 : 14,
                      fontWeight: 900,
                      color: "#ffffff",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.04em",
                    },
                    children: team.name,
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 10,
                      fontWeight: 700,
                      color: team.color,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.15em",
                      opacity: 0.8,
                    },
                    children: team.region,
                  },
                },
              ],
            },
          },
          // Rating + label
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "flex-end" as const,
                gap: 2,
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: isTop3 ? 20 : 15,
                      fontWeight: 900,
                      color: isTop3 ? "#fff" : "#555",
                    },
                    children: `${team.rating}`,
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#2a2a2a",
                      letterSpacing: "0.1em",
                    },
                    children: "ELO",
                  },
                },
              ],
            },
          },
        ],
      },
    });

    // ── Stat pill ───────────────────────────────────────────────────────────
    const statPill = (value: string, label: string) => ({
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center" as const,
          gap: 4,
          flex: 1,
        },
        children: [
          {
            type: "span",
            props: {
              style: {
                fontSize: 26,
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.02em",
              },
              children: value,
            },
          },
          {
            type: "span",
            props: {
              style: {
                fontSize: 10,
                fontWeight: 700,
                color: "#444",
                letterSpacing: "0.2em",
                textTransform: "uppercase" as const,
              },
              children: label,
            },
          },
        ],
      },
    });

    // ── Vertical divider ────────────────────────────────────────────────────
    const divider = {
      type: "div",
      props: {
        style: {
          width: 1,
          height: 40,
          background: "rgba(255,255,255,0.06)",
        },
      },
    };

    // ── Build card ──────────────────────────────────────────────────────────
    const card = {
      type: "div",
      props: {
        style: {
          width: W,
          height: H,
          background: "#080808",
          display: "flex",
          flexDirection: "column" as const,
          fontFamily: "Inter",
          position: "relative" as const,
          overflow: "hidden",
        },
        children: [
          // Grid background
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                inset: 0,
                display: "flex",
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.025) 39px, rgba(255,255,255,0.025) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.025) 39px, rgba(255,255,255,0.025) 40px)",
              },
            },
          },

          // Top bar
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "36px 40px 0",
                position: "relative",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: { display: "flex", alignItems: "center", gap: 10 },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background: "#ec0201",
                          },
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#444",
                            letterSpacing: "0.3em",
                            textTransform: "uppercase" as const,
                          },
                          children: "OWCS Nexus",
                        },
                      },
                    ],
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 11,
                      color: "#333",
                      letterSpacing: "0.1em",
                    },
                    children: `Season 3 · ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
                  },
                },
              ],
            },
          },

          // Title block
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column" as const,
                padding: "20px 40px 28px",
                position: "relative",
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#333",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase" as const,
                      marginBottom: 6,
                    },
                    children: "Global Power Rankings",
                  },
                },
                {
                  type: "h1",
                  props: {
                    style: {
                      fontSize: 56,
                      fontWeight: 900,
                      color: "#ffffff",
                      textTransform: "uppercase" as const,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                      margin: 0,
                    },
                    children: "Top 10 Teams",
                  },
                },
              ],
            },
          },

          // Rankings list
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column" as const,
                flex: 1,
                gap: 6,
                padding: "0 40px",
                position: "relative",
              },
              children: teams.map((t) => rankRow(t, t.rank <= 3)),
            },
          },

          // Stat summary row
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                margin: "24px 40px 0",
                padding: "24px 0",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                position: "relative",
              },
              children: [
                statPill(`${totalMatches}`, "Matches Tracked"),
                divider,
                statPill(`${regionCount}`, "Regions"),
                divider,
                statPill(lastUpdated, "Last Updated"),
              ],
            },
          },

          // Footer
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 40px 32px",
                position: "relative",
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 11,
                      color: "#222",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase" as const,
                    },
                    children: "owcsnexus.xyz",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 11,
                      color: "#222",
                      letterSpacing: "0.1em",
                    },
                    children: "ELO-based · All regions",
                  },
                },
              ],
            },
          },
        ],
      },
    };

    // ── Render ──────────────────────────────────────────────────────────────
    const svg = await satori(card, { width: W, height: H, fonts });
    const resvg = new Resvg(svg, { background: "rgba(8,8,8,1)" });
    const png = resvg.render().asPng();

    return new Response(png as unknown as Uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (e: any) {
    console.error("[OG] Failed to generate image:", e);
    return new Response("Failed to generate OG image", { status: 500 });
  }
};
