feat(leaderboard): top 3 podium intro animation, rank badges, shadow fixes & UX polish
#21/**
 * Backfill PlayerProfile rows for completed users missing one.
 * Run: npx dotenv -e .env.local -- node scripts/backfill-missing-profiles.mjs
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

function usernameKey(name) {
  return name.trim().toLowerCase();
}

try {
  const users = await p.user.findMany({
    where: { signupCompleted: true, playerProfile: null },
    select: { id: true, name: true, email: true, olympusId: true },
  });

  if (users.length === 0) {
    console.log("No users missing PlayerProfile.");
    process.exit(0);
  }

  for (const u of users) {
    const displayName = u.name?.trim() || u.olympusId?.trim() || u.email?.split("@")[0] || "Player";
    const key = usernameKey(displayName);

    const taken = await p.playerProfile.findUnique({
      where: { usernameKey: key },
      select: { userId: true },
    });
    if (taken && taken.userId !== u.id) {
      console.warn(`Skip ${u.email}: username key "${key}" already taken`);
      continue;
    }

    await p.playerProfile.create({
      data: {
        userId: u.id,
        displayName,
        usernameKey: key,
        town: "Mangaluru",
      },
    });
    console.log(`Created profile for ${u.email} → @${displayName}`);
  }
} finally {
  await p.$disconnect();
}
