/**
 * Valorant Map Splash Asset Resolver
 * Maps Valorant map names (Ascent, Icebox, Haven, Lotus, Split, Bind, Sunset, Breeze, Pearl, Abyss)
 * to high-resolution artwork.
 */

const LOCAL_MAP_FILES: Record<string, string> = {
  ascent: "/images/maps/ascent.png",
  haven: "/images/maps/haven.png",
  bind: "/images/maps/bind.png",
  split: "/images/maps/split.png",
  icebox: "/images/maps/icebox.png",
  breeze: "/images/maps/breeze.png",
  fracture: "/images/maps/fracture.png",
  pearl: "/images/maps/pearl.png",
  lotus: "/images/maps/lotus.png",
  sunset: "/images/maps/sunset.png",
  abyss: "/images/maps/abyss.png",
  corrode: "/images/maps/corrode.png",
  summit: "/images/maps/summit.png",
};

const OFFICIAL_MAP_SPLASH_IDS: Record<string, string> = {
  ascent: "7eae24b7-42ba-45d9-96e6-2ab340dd1699",
  icebox: "e2918f0d-47cb-4340-ad4c-b96b4777b8ab",
  haven: "2bee0c3d-4c30-47d6-a77a-6f01f587777a",
  lotus: "2fe4ed40-45bf-4d98-a0a3-64e34f5d77be",
  split: "d1b58161-4e69-42d8-b19e-a5415777632d",
  bind: "2c9d114c-4424-3e49-b66d-3ac38677556a",
  sunset: "92547d6c-438e-4901-a14a-f12924d6bd7a",
  breeze: "2fb9a57d-4727-4c7d-b1be-b1e5855e3b23",
  pearl: "fd267378-4a1d-484f-b78b-6f030968110a",
  abyss: "2240363e-4d87-6161-e338-669d7a049187",
  fracture: "b529732b-44a3-4d72-b6e4-907888e2a4f4",
};

// Used when a game has no map recorded or reports a name we don't know yet.
// Must stay local: the valorant-api splash URLs 404 today, so a remote fallback
// renders as a broken tile.
const FALLBACK_MAP_SPLASH = "/images/maps/ascent.png";

export function getValorantMapSplashUrl(mapName: string | null | undefined): string {
  if (!mapName) return FALLBACK_MAP_SPLASH;
  const key = mapName.trim().toLowerCase();

  // Return local uploaded map image if present
  if (LOCAL_MAP_FILES[key]) {
    return LOCAL_MAP_FILES[key];
  }

  const id = OFFICIAL_MAP_SPLASH_IDS[key];
  if (id) {
    return `https://media.valorant-api.com/maps/${id}/splash.png`;
  }

  return FALLBACK_MAP_SPLASH;
}
