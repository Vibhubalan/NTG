import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Force Dev URL from .env.local (ignore shell)
const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
let databaseUrl = null;
for (const line of text.split(/\r?\n/)) {
  if (line.startsWith("#")) continue;
  const m = line.match(/^DATABASE_URL=(.*)$/);
  if (!m) continue;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  databaseUrl = v;
  break;
}

process.env.DATABASE_URL = databaseUrl;
console.log("Using", new URL(databaseUrl.replace(/^postgresql:/, "http:")).host);

const p = new PrismaClient();
try {
  const t = await p.tournament.findFirst({
    where: { slug: { equals: "auc-cup-4", mode: "insensitive" } },
    include: {
      season: true,
      placements: {
        include: {
          user: {
            include: {
              playerProfile: { include: { gameLinks: true } },
              registrations: {
                where: { tournament: { slug: { equals: "auc-cup-4", mode: "insensitive" } } },
              },
              leaderboard: { orderBy: { updatedAt: "desc" }, take: 1 },
            },
          },
        },
      },
      tournamentTeams: {
        include: {
          players: { include: { registration: true } },
          registrations: true,
        },
      },
      bracket: { include: { matches: { include: { participants: true, result: true } } } },
      registrations: { where: { status: "APPROVED" } },
      _count: { select: { registrations: true } },
    },
  });
  console.log("found:", t?.slug ?? null);
  console.log("regs:", t?._count?.registrations ?? null);
  console.log("teams:", t?.tournamentTeams?.length ?? null);
} catch (e) {
  console.error("QUERY ERROR:", e.message);
  if (e.meta) console.error("meta:", e.meta);
} finally {
  await p.$disconnect();
}
