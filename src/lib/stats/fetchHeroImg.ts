// src/lib/heroPortraits.ts
// Hero portraits hosted on Cloudinary at 256x256.
// URL pattern: https://res.cloudinary.com/dm1bfprgq/image/upload/v1772646686/{name}.png
// Where {name} is the hero's name lowercased with all spaces and special characters removed.

const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dm1bfprgq/image/upload/v1772646686";

// Special cases where the Liquipedia name doesn't normalize cleanly
const OVERRIDES: Record<string, string> = {
  "soldier: 76": "soldier76",
  "soldier:76": "soldier76",
  "d.va": "dva",
  torbjörn: "torbjorn",
  lúcio: "lucio",
};

export type HeroRole = "Tank" | "Damage" | "Support";

// Hardcoded role map — update when Blizzard adds a new hero
const HERO_ROLES: Record<string, HeroRole> = {
  // ── TANK ──
  "D.Va": "Tank",
  Domina: "Tank",
  Doomfist: "Tank",
  Hazard: "Tank",
  "Junker Queen": "Tank",
  Mauga: "Tank",
  Orisa: "Tank",
  Ramattra: "Tank",
  Reinhardt: "Tank",
  Roadhog: "Tank",
  Sigma: "Tank",
  Winston: "Tank",
  "Wrecking Ball": "Tank",
  Zarya: "Tank",

  // ── DAMAGE ──
  Anran: "Damage",
  Ashe: "Damage",
  Bastion: "Damage",
  Cassidy: "Damage",
  Echo: "Damage",
  Emre: "Damage",
  Freja: "Damage",
  Genji: "Damage",
  Hanzo: "Damage",
  Junkrat: "Damage",
  Mei: "Damage",
  Pharah: "Damage",
  Reaper: "Damage",
  Sojourn: "Damage",
  "Soldier: 76": "Damage",
  Sombra: "Damage",
  Symmetra: "Damage",
  Torbjörn: "Damage",
  Tracer: "Damage",
  Venture: "Damage",
  Vendetta: "Damage",
  Widowmaker: "Damage",

  // ── SUPPORT ──
  Ana: "Support",
  Baptiste: "Support",
  Brigitte: "Support",
  Illari: "Support",
  Juno: "Support",
  Kiriko: "Support",
  Lifeweaver: "Support",
  Lúcio: "Support",
  Mercy: "Support",
  Moira: "Support",
  Zenyatta: "Support",
  Wuyang: "Support",
  "Jetpack Cat": "Support",
  Mizuki: "Support",
};

/**
 * Get the role for a hero by name.
 * Falls back to 'Damage' if unknown (most new heroes are Damage).
 */
export function getHeroRole(heroName: string): HeroRole {
  // Direct match first
  if (HERO_ROLES[heroName]) return HERO_ROLES[heroName];
  // Case-insensitive fallback
  const lower = heroName.toLowerCase();
  const key = Object.keys(HERO_ROLES).find((k) => k.toLowerCase() === lower);
  return key ? HERO_ROLES[key] : "Damage";
}

/**
 * Normalize a hero name to match the Cloudinary filename.
 * e.g. "Wrecking Ball" → "wreckingball", "D.Va" → "dva"
 */
export function normalizeHeroName(name: string): string {
  const lower = name.toLowerCase().trim();
  if (OVERRIDES[lower]) return OVERRIDES[lower];
  // Remove all non-alphanumeric characters (spaces, dots, colons, accents)
  return lower.replace(/[^a-z0-9]/g, "");
}

/**
 * Get the Cloudinary portrait URL for a hero by name.
 * Works with any capitalisation or spacing — no maintenance needed
 * unless Blizzard adds a hero with unusual characters.
 */
export function getHeroPortrait(heroName: string): string {
  const normalized = normalizeHeroName(heroName);
  return `${CLOUDINARY_BASE}/${normalized}.png`;
}
