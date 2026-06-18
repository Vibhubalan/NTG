/**
 * One-time migration: copy static tournament overlay + moments into DB.
 * Run: dotenv -e .env.local -- tsx scripts/migrate-static-to-db.ts
 */
import { prisma } from "../src/core/database/client";
import { STATIC_TOURNAMENT_DETAIL } from "../src/lib/tournament-static-detail";
import { loungeFeaturedDeck } from "../src/lib/moments-featured";
import { defaultPrizeSplit } from "../src/modules/tournaments-leagues/application/admin-tournament.service";

async function main() {
  console.log("Migrating static tournament data to DB…");

  for (const [slug, overlay] of Object.entries(STATIC_TOURNAMENT_DETAIL)) {
    const tournament = await prisma.tournament.findUnique({ where: { slug } });
    if (!tournament) {
      console.log(`  skip ${slug} — not in DB`);
      continue;
    }

    const prizePool = tournament.prizePool ? Number(tournament.prizePool) : 15000;

    await prisma.tournament.update({
      where: { slug },
      data: {
        bracketUrl: tournament.bracketUrl ?? overlay.bracketUrl ?? null,
        teams: overlay.teams?.length ? overlay.teams : undefined,
        prizeSplit: defaultPrizeSplit(prizePool),
      },
    });

    if (overlay.teams?.length) {
      const existingTeams = await prisma.tournamentTeam.count({
        where: { tournamentId: tournament.id },
      });
      if (existingTeams === 0) {
        for (let i = 0; i < overlay.teams.length; i++) {
          await prisma.tournamentTeam.create({
            data: {
              tournamentId: tournament.id,
              name: overlay.teams[i],
              sortOrder: i,
            },
          });
        }
      }
    }

    if (overlay.placements) {
      const roles = [
        { role: "CHAMPION" as const, label: overlay.placements.champion },
        { role: "RUNNER_UP" as const, label: overlay.placements.runnerUp },
        { role: "MVP" as const, label: overlay.placements.mvp },
      ];
      for (const { role, label } of roles) {
        if (!label) continue;
        await prisma.tournamentPlacement.upsert({
          where: { tournamentId_role: { tournamentId: tournament.id, role } },
          create: { tournamentId: tournament.id, role, teamLabel: label },
          update: { teamLabel: label },
        });
      }
    }

    console.log(`  ✓ ${slug}`);
  }

  const deckCount = await prisma.momentsFeaturedDeck.count();
  if (deckCount === 0) {
    const deck = await prisma.momentsFeaturedDeck.create({
      data: {
        slug: loungeFeaturedDeck.slug,
        eyebrow: loungeFeaturedDeck.eyebrow,
        title: loungeFeaturedDeck.title,
        subtitle: loungeFeaturedDeck.subtitle,
        displayMode: "BLEND",
        active: true,
        images: {
          create: loungeFeaturedDeck.images.map((img, i) => ({
            url: img.src,
            alt: img.alt,
            sortOrder: i,
          })),
        },
      },
    });
    console.log(`  ✓ featured deck ${deck.slug}`);
  }

  console.log("Done. Set NEXT_PUBLIC_USE_STATIC_TOURNAMENT_DETAIL=0 when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
