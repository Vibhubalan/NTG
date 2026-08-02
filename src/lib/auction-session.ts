import { prisma } from "@core/database/client";

/**
 * Auction sessions live in the external auction app DB schema when present.
 * Dev DBs may not have this table — never throw / never wipe teams here.
 */
export async function getAuctionSessionFinalized(
  tournamentId: string,
): Promise<boolean | null> {
  const [{ exists }] = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT to_regclass('public.auction_sessions') IS NOT NULL AS exists`,
  );
  if (!exists) return null;

  const [row] = await prisma.$queryRawUnsafe<{ finalized: boolean }[]>(
    `SELECT finalized FROM auction_sessions WHERE tournament_id = $1 LIMIT 1`,
    tournamentId,
  );
  return row?.finalized === true;
}
