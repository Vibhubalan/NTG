/**
 * Backfill riotPlayerCard / riotPlayerCardWide via Henrik account API.
 * Run: npx dotenv -e .env.local -- node scripts/backfill-player-cards.mjs
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const apiKey = process.env.HENRIKDEV_API_KEY;
const delayMs = 2100;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function deriveWide(large, wide) {
  if (wide) return wide;
  if (!large) return null;
  if (large.includes("/wideart")) return large;
  if (large.includes("/largeart")) return large.replace("/largeart", "/wideart");
  if (large.includes("/smallart")) return large.replace("/smallart", "/wideart");
  return null;
}

async function fetchCard(gameName, tagLine) {
  if (!apiKey) return null;
  const res = await fetch(
    `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { headers: { Authorization: apiKey } },
  );
  if (!res.ok) return null;
  const body = await res.json();
  const card = body.data?.card;
  if (!card?.large && !card?.wide) return null;
  const large = card.large ?? null;
  const wide = deriveWide(large, card.wide ?? null);
  return { large, wide };
}

try {
  // Fast pass: derive wide URLs from existing large art (no API calls)
  const missingWide = await p.user.findMany({
    where: { riotPlayerCard: { not: null }, riotPlayerCardWide: null },
    select: { id: true, riotGameName: true, riotTagLine: true, riotPlayerCard: true },
  });

  let derived = 0;
  for (const u of missingWide) {
    const wide = deriveWide(u.riotPlayerCard, null);
    if (wide) {
      await p.user.update({ where: { id: u.id }, data: { riotPlayerCardWide: wide } });
      derived += 1;
      console.log(`↪ derived wide for ${u.riotGameName ?? u.id}`);
    }
  }
  if (derived > 0) console.log(`Derived wide art for ${derived} users.`);

  if (!apiKey) {
    console.error("HENRIKDEV_API_KEY missing — skipped Henrik fetch pass.");
    process.exit(derived > 0 ? 0 : 1);
  }

  const users = await p.user.findMany({
    where: {
      signupCompleted: true,
      riotPuuid: { not: null },
      riotGameName: { not: null },
      riotTagLine: { not: null },
      OR: [{ riotPlayerCard: null }, { riotPlayerCardWide: null }],
    },
    select: {
      id: true,
      riotGameName: true,
      riotTagLine: true,
      riotPlayerCard: true,
      riotPlayerCardWide: true,
    },
  });

  if (users.length === 0) {
    console.log("All linked players already have player card URLs.");
    process.exit(0);
  }

  console.log(`Backfilling player cards for ${users.length} users…`);

  let updated = 0;
  for (const u of users) {
    const card = await fetchCard(u.riotGameName, u.riotTagLine);
    if (card?.large || card?.wide) {
      await p.user.update({
        where: { id: u.id },
        data: {
          ...(card.large ? { riotPlayerCard: card.large } : {}),
          ...(card.wide ? { riotPlayerCardWide: card.wide } : {}),
        },
      });
      updated += 1;
      console.log(`✓ ${u.riotGameName}#${u.riotTagLine}`);
    } else {
      console.warn(`✗ No card for ${u.riotGameName}#${u.riotTagLine}`);
    }
    await sleep(delayMs);
  }

  console.log(`Done. Updated ${updated}/${users.length}.`);
} finally {
  await p.$disconnect();
}
