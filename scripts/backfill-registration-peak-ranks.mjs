/**
 * Backfill snapshotPeakRank* on Valorant tournament registrations missing peak data.
 * Run: npx dotenv -e .env.local -- node scripts/backfill-registration-peak-ranks.mjs
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const apiKey = process.env.HENRIKDEV_API_KEY;
const delayMs = 2100;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeRegion(region) {
  const r = (region ?? "ap").trim().toLowerCase();
  if (r === "na" || r === "eu" || r === "ap" || r === "kr" || r === "br" || r === "latam") return r;
  return "ap";
}

async function fetchPeak(region, gameName, tagLine) {
  if (!apiKey) return null;
  const res = await fetch(
    `https://api.henrikdev.xyz/valorant/v2/mmr/${normalizeRegion(region)}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { headers: { Authorization: apiKey } },
  );
  if (!res.ok) return null;
  const body = await res.json();
  const highest = body.data?.highest_rank;
  if (!highest) return null;
  return {
    tier: highest.patched_tier ?? null,
    tierId: typeof highest.tier === "number" ? highest.tier : null,
    act: highest.season ?? null,
  };
}

try {
  if (!apiKey) {
    console.error("HENRIKDEV_API_KEY missing.");
    process.exit(1);
  }

  const rows = await p.tournamentRegistration.findMany({
    where: {
      snapshotPeakRankTier: null,
      tournament: { game: "VALORANT" },
    },
    select: {
      id: true,
      user: {
        select: {
          riotGameName: true,
          riotTagLine: true,
          riotRegion: true,
        },
      },
    },
  });

  console.log(`Found ${rows.length} Valorant registrations without peak snapshot.`);

  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const { riotGameName, riotTagLine, riotRegion } = row.user;
    if (!riotGameName || !riotTagLine) {
      failed += 1;
      console.warn(`skip ${row.id}: no riot id`);
      continue;
    }

    const peak = await fetchPeak(riotRegion, riotGameName, riotTagLine);
    await sleep(delayMs);

    if (!peak?.tier) {
      failed += 1;
      console.warn(`skip ${row.id}: no peak from Henrik`);
      continue;
    }

    await p.tournamentRegistration.update({
      where: { id: row.id },
      data: {
        snapshotPeakRankTier: peak.tier,
        snapshotPeakRankTierId: peak.tierId,
        snapshotPeakAct: peak.act,
      },
    });
    updated += 1;
    console.log(`ok ${riotGameName}#${riotTagLine} -> peak ${peak.tier}`);
  }

  console.log(`Done. Updated ${updated}, failed/skipped ${failed}.`);
} finally {
  await p.$disconnect();
}
