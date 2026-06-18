/**
 * One-time backfill: assign NTG#### accountId to users missing one.
 * Usage: dotenv -e .env.local -- node scripts/backfill-account-ids.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function randomAccountId() {
  const num = Math.floor(Math.random() * 10_000);
  return `NTG${String(num).padStart(4, "0")}`;
}

async function assignId(userId) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = randomAccountId();
    const taken = await prisma.user.findUnique({
      where: { accountId: candidate },
      select: { id: true },
    });
    if (taken) continue;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { accountId: candidate },
      });
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error(`Failed to assign ID for user ${userId}`);
}

async function main() {
  const users = await prisma.user.findMany({
    where: { accountId: null },
    select: { id: true, email: true },
  });
  console.log(`Backfilling ${users.length} user(s)...`);
  for (const u of users) {
    const id = await assignId(u.id);
    console.log(`  ${u.email ?? u.id} → ${id}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
