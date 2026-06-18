import { tournaments, tournamentRegistration } from "@/lib/data";
import {
  GameSlug,
  PrismaClient,
  TournamentStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

function mapGame(game: string): GameSlug {
  if (game.includes("Valorant")) return "VALORANT";
  if (game.includes("Counter-Strike") || game.includes("CS")) return "CS2";
  if (game.includes("FC") || game.includes("EA")) return "EA_FC26";
  return "OTHER";
}

function mapStatus(t: (typeof tournaments)[0]): TournamentStatus {
  if (t.status === "Hosted") return "COMPLETED";
  if (t.id === tournamentRegistration.cupId && tournamentRegistration.active) {
    return "REGISTRATION_OPEN";
  }
  return "DRAFT";
}

function parseSeasonLabel(label: string): string {
  if (label.startsWith("Season")) return label;
  if (label.startsWith("Edition")) return label.replace("Edition", "Season");
  return label;
}

function parseStartsAt(date: string): Date {
  const monthMap: Record<string, number> = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11,
  };
  const [month, year] = date.split(" ");
  return new Date(Number(year), monthMap[month] ?? 0, 15);
}

const samplePlacements: Record<string, { champion: string; runnerUp: string; mvp: string; prize: number }> = {
  "val-cup-1": { champion: "Team Phoenix", runnerUp: "Mangalore Five", mvp: "rxven", prize: 15000 },
  "cs-cup-1": { champion: "Coastal CS", runnerUp: "Hostel Heroes", mvp: "s1mple_mlr", prize: 12000 },
  "val-cup-2": { champion: "Tulunad Titans", runnerUp: "Bunts Brigade", mvp: "viperX", prize: 15000 },
  "auc-cup-1": { champion: "Auction Kings", runnerUp: "Draft Devils", mvp: "jettMain", prize: 20000 },
  "auc-cup-2": { champion: "Bid Squad", runnerUp: "Gavel Gang", mvp: "omenOG", prize: 20000 },
};

async function main() {
  const seasonLabels = [...new Set(tournaments.map((t) => parseSeasonLabel(t.season)))];
  const seasonMap = new Map<string, string>();

  for (const label of seasonLabels) {
    const season = await prisma.season.upsert({
      where: { id: label },
      create: { id: label, label },
      update: { label },
    });
    seasonMap.set(label, season.id);
  }

  for (const t of tournaments) {
    const seasonLabel = parseSeasonLabel(t.season);
    const hideAfter =
      t.id === tournamentRegistration.cupId && tournamentRegistration.hideAfter
        ? new Date(`${tournamentRegistration.hideAfter}T23:59:59`)
        : null;

    const placement = samplePlacements[t.id];
    const isLiveFifaCup = t.id === "fc26-cup-1";
    const status = isLiveFifaCup ? "REGISTRATION_OPEN" : mapStatus(t);

    const tournament = await prisma.tournament.upsert({
      where: { slug: t.id },
      create: {
        slug: t.id,
        name: t.name,
        game: mapGame(t.game),
        gameLabel: t.game,
        seasonId: seasonMap.get(seasonLabel),
        status,
        startsAt: parseStartsAt(t.date),
        prizePool: 15000,
        prizeNotes: t.id === "fc26-cup-1" ? "2v2 · PS5 · Top 8" : null,
        registrationUrl: null,
        hideAfter,
        showOnEsportsHub: isLiveFifaCup,
      },
      update: {
        name: t.name,
        game: mapGame(t.game),
        gameLabel: t.game,
        seasonId: seasonMap.get(seasonLabel),
        status,
        startsAt: parseStartsAt(t.date),
        prizePool: 15000,
        prizeNotes: t.id === "fc26-cup-1" ? "2v2 · PS5 · Top 8" : null,
        registrationUrl: null,
        hideAfter,
        showOnEsportsHub: isLiveFifaCup,
      },
    });

    if (placement) {
      for (const [role, label] of [
        ["CHAMPION", placement.champion],
        ["RUNNER_UP", placement.runnerUp],
        ["MVP", placement.mvp],
      ] as const) {
        await prisma.tournamentPlacement.upsert({
          where: {
            tournamentId_role: { tournamentId: tournament.id, role },
          },
          create: {
            tournamentId: tournament.id,
            role,
            teamLabel: label,
          },
          update: { teamLabel: label },
        });
      }
    }
  }

  const igSource = await prisma.gallerySource.upsert({
    where: { platform_handle: { platform: "instagram", handle: "ntg_lounge" } },
    create: { platform: "instagram", handle: "ntg_lounge", active: true },
    update: { active: true },
  });

  await prisma.gallerySource.upsert({
    where: { platform_handle: { platform: "youtube", handle: "ntg_lounge" } },
    create: { platform: "youtube", handle: "ntg_lounge", active: false },
    update: { active: false },
  });

  const galleryItems = [
    {
      sourceId: igSource.id,
      externalId: "ig-1",
      mediaType: "image",
      embedUrl: "https://www.instagram.com/ntg_lounge/",
      thumbnailUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=600&fit=crop",
      caption: "VAL CUP I finals night at NTG Lounge",
      pinned: true,
    },
    {
      sourceId: igSource.id,
      externalId: "ig-2",
      mediaType: "image",
      embedUrl: "https://www.instagram.com/ntg_lounge/",
      thumbnailUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&h=600&fit=crop",
      caption: "300Hz arena · Mangaluru",
      pinned: false,
    },
    {
      sourceId: igSource.id,
      externalId: "ig-3",
      mediaType: "reel",
      embedUrl: "https://www.instagram.com/ntg_lounge/",
      thumbnailUrl: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&h=600&fit=crop",
      caption: "CS CUP I — coastal champions",
      pinned: false,
    },
  ];

  for (const item of galleryItems) {
    await prisma.galleryItem.upsert({
      where: { sourceId_externalId: { sourceId: item.sourceId, externalId: item.externalId } },
      create: { ...item, publishedAt: new Date() },
      update: { ...item, publishedAt: new Date() },
    });
  }

  console.log(`Seeded ${tournaments.length} tournaments and gallery.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
