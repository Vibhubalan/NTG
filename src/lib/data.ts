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
  status: "Past" | "Upcoming";
  iconPath: string;
  hex: string;
};

export const tournaments: Tournament[] = [
  {
    id: "val-cup-1",
    name: "VAL CUP I",
    game: "Valorant",
    season: "Season 01",
    date: "2024",
    status: "Past",
    iconPath: siValorant.path,
    hex: `#${siValorant.hex}`,
  },
  {
    id: "cs-cup-1",
    name: "CS CUP I",
    game: "Counter-Strike 2",
    season: "Season 01",
    date: "2024",
    status: "Past",
    iconPath: siCounterstrike.path,
    hex: `#${siCounterstrike.hex}`,
  },
  {
    id: "val-cup-2",
    name: "VAL CUP II",
    game: "Valorant",
    season: "Season 02",
    date: "2025",
    status: "Past",
    iconPath: siValorant.path,
    hex: `#${siValorant.hex}`,
  },
  {
    id: "auc-cup-1",
    name: "AUC CUP I",
    game: "Auction Draft Cup",
    season: "Edition 01",
    date: "2025",
    status: "Past",
    iconPath: siValorant.path,
    hex: "#a855f7",
  },
  {
    id: "auc-cup-2",
    name: "AUC CUP II",
    game: "Auction Draft Cup",
    season: "Edition 02",
    date: "2025",
    status: "Past",
    iconPath: siValorant.path,
    hex: "#d946ef",
  },
];

export const socials = [
  { name: "Instagram", href: "https://instagram.com/ntg_lounge", path: siInstagram.path },
  { name: "Discord", href: "#", path: siDiscord.path },
  { name: "WhatsApp", href: "#", path: siWhatsapp.path },
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
  meaning: "Namma Tulu Nadu Gaming",
  tagline: "Esport Lounge",
  hours: "10 AM — 11 PM",
  address: "302, Lotus Paradise Elite, Bunts Hostel, MLR",
  link: "linktr.ee/NTGEsport",
  instagram: "@ntg_lounge",
};
