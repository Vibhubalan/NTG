import {
  siValorant,
  siCounterstrike,
  siLeagueoflegends,
  siDota2,
  siFortnite,
  siPubg,
  siEa,
  siThefinals,
  siRiotgames,
  siSteam,
  siPlaystation5,
  siEpicgames,
  siInstagram,
  siDiscord,
  siWhatsapp,
} from "simple-icons";
import {
  discordUrl,
  instagramUrl,
  whatsappInquiryUrl,
} from "./env";

export type GameIcon = {
  name: string;
  slug: string;
  hex: string;
  path: string;
  category: "FPS" | "MOBA" | "Battle Royale" | "Sports" | "Other";
};

export const games: GameIcon[] = [
  { name: "Valorant", slug: "valorant", hex: `#${siValorant.hex}`, path: siValorant.path, category: "FPS" },
  { name: "Counter-Strike", slug: "cs2", hex: `#${siCounterstrike.hex}`, path: siCounterstrike.path, category: "FPS" },
  { name: "The Finals", slug: "finals", hex: `#${siThefinals.hex}`, path: siThefinals.path, category: "FPS" },
  { name: "League of Legends", slug: "lol", hex: `#${siLeagueoflegends.hex}`, path: siLeagueoflegends.path, category: "MOBA" },
  { name: "Dota 2", slug: "dota2", hex: `#${siDota2.hex}`, path: siDota2.path, category: "MOBA" },
  { name: "Fortnite", slug: "fortnite", hex: `#${siFortnite.hex}`, path: siFortnite.path, category: "Battle Royale" },
  { name: "PUBG", slug: "pubg", hex: `#${siPubg.hex}`, path: siPubg.path, category: "Battle Royale" },
  { name: "EA FC 25", slug: "fc25", hex: `#${siEa.hex}`, path: siEa.path, category: "Sports" },
];

export type Platform = { name: string; hex: string; path: string };

export const platforms: Platform[] = [
  { name: "Steam", hex: `#${siSteam.hex}`, path: siSteam.path },
  { name: "PlayStation 5", hex: `#${siPlaystation5.hex}`, path: siPlaystation5.path },
  { name: "Epic Games", hex: `#${siEpicgames.hex}`, path: siEpicgames.path },
  { name: "Riot Games", hex: `#${siRiotgames.hex}`, path: siRiotgames.path },
];

export type Tournament = {
  id: string;
  name: string;
  game: string;
  season: string;
  date: string;
  status: "Hosted" | "Soon";
  iconPath: string;
  hex: string;
};

/** Active registration callout — set `active: false` when sign-ups close. */
export const tournamentRegistration = {
  active: false,
  cupId: "fc26-cup-1",
  title: "FC26 CUP I",
  detail: "2v2 · 20 June 2026",
  /** Main headline — use the public-facing cup name here. */
  message: "Registrations are live for FIFA CUP 1.",
  href: "https://docs.google.com/forms/d/e/1FAIpQLScLO1HKslTILHz14WGZFogqr6YzMvAfncXGavYPeqqQ6HvZew/viewform",
  /** Last calendar day the banner may show (YYYY-MM-DD). Hidden from the next day onward. */
  hideAfter: "2026-06-20",
};

/** True while the static marketing registration banner should render (respects `active` + `hideAfter`). */
export function isStaticRegistrationBannerLive(
  reg: typeof tournamentRegistration = tournamentRegistration,
): boolean {
  if (!reg.active) return false;
  if (reg.hideAfter) {
    const [y, m, d] = reg.hideAfter.split("-").map(Number);
    const lastVisible = new Date(y, m - 1, d, 23, 59, 59, 999);
    if (Date.now() > lastVisible.getTime()) return false;
  }
  return true;
}

export const tournaments: Tournament[] = [
  {
    id: "val-cup-1",
    name: "VAL CUP I",
    game: "Valorant",
    season: "Season 01",
    date: "March 2026",
    status: "Hosted",
    iconPath: siValorant.path,
    hex: `#${siValorant.hex}`,
  },
  {
    id: "cs-cup-1",
    name: "CS CUP I",
    game: "Counter-Strike 2",
    season: "Season 01",
    date: "March 2026",
    status: "Hosted",
    iconPath: siCounterstrike.path,
    hex: `#${siCounterstrike.hex}`,
  },
  {
    id: "val-cup-2",
    name: "VAL CUP II",
    game: "Valorant",
    season: "Season 02",
    date: "April 2026",
    status: "Hosted",
    iconPath: siValorant.path,
    hex: `#${siValorant.hex}`,
  },
  {
    id: "auc-cup-1",
    name: "AUC CUP I",
    game: "Valorant · Auction Draft",
    season: "Edition 01",
    date: "April 2026",
    status: "Hosted",
    iconPath: siValorant.path,
    hex: `#${siValorant.hex}`,
  },
  {
    id: "auc-cup-2",
    name: "AUC CUP II",
    game: "Valorant · Auction Draft",
    season: "Edition 02",
    date: "June 2026",
    status: "Hosted",
    iconPath: siValorant.path,
    hex: `#${siValorant.hex}`,
  },
  {
    id: "fc26-cup-1",
    name: "FC26 CUP I",
    game: "EA FC 26 · 2v2",
    season: "Season 03",
    date: "June 2026",
    status: "Hosted",
    iconPath: siEa.path,
    hex: `#${siEa.hex}`,
  },
  {
    id: "auc-cup-3",
    name: "AUC CUP III",
    game: "Counter-Strike 2 · Auction Draft",
    season: "Season 03",
    date: "June 2026",
    status: "Soon",
    iconPath: siCounterstrike.path,
    hex: `#${siCounterstrike.hex}`,
  },
];

export const socials = [
  { name: "Instagram", href: instagramUrl, path: siInstagram.path },
  { name: "Discord", href: discordUrl || "#", path: siDiscord.path },
  { name: "WhatsApp", href: whatsappInquiryUrl(), path: siWhatsapp.path },
];

export const specs = [
  { label: "Processor", value: "Ryzen 5 7600X" },
  { label: "Graphics", value: "RTX 5060" },
  { label: "Display", value: "300Hz" },
  { label: "Peripherals", value: "Gigabyte" },
];

export const services = ["PC", "PS5", "Screening", "Birthdays", "Esports"];

export const brand = {
  name: "NTG Lounge",
  meaning: "Namma Tulunad Gaming",
  tagline: "Esport Lounge",
  hours: "10 AM — 11 PM",
  address: "302, Lotus Paradise Elite, Bunts Hostel, MLR",
  // Lat/Lng of the lounge — used for the embedded map so it never
  // auto-opens Google's place info card.
  coords: "12.876034,74.843494",
  link: "linktr.ee/NTGEsport",
  instagram: "@ntg_lounge",
};
