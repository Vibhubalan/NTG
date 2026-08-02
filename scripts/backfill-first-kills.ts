/**
 * Backfill TournamentGamePlayer.firstKills / firstDeaths from stored payloadJson.
 * Safe: no deletes. Re-runnable.
 *
 *   npx dotenv -e .env.local -o -- tsx scripts/backfill-first-kills.ts
 *   SLUG=auc-cup-4 npx dotenv -e .env.local -o -- tsx scripts/backfill-first-kills.ts
 */
import { backfillTournamentGameFirstKillDeaths } from "../src/modules/tournaments-leagues/application/tournament-games.service";

async function main() {
  const slug = process.env.SLUG?.trim() || undefined;
  const result = await backfillTournamentGameFirstKillDeaths({
    tournamentSlug: slug,
  });
  console.log(
    JSON.stringify(
      {
        slug: slug ?? "ALL",
        ...result,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
