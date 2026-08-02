/**
 * Read-only prod readiness check. Never mutates data.
 * Uses #PROD DIRECT_URL from .env.local.
 */
import { readFileSync } from "node:fs";
import { Client } from "pg";

const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const prodMatch = text.match(/#PROD[\s\S]*?# DIRECT_URL=(.+)/);
const prod = prodMatch?.[1]?.trim();
if (!prod) {
  console.error("No #PROD DIRECT_URL found in .env.local");
  process.exit(1);
}

let hostname = "?";
try {
  hostname = new URL(prod.replace(/^postgresql:/, "http:")).hostname;
} catch {
  /* ignore */
}

const client = new Client({
  connectionString: prod,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("CONNECTED_HOST=", hostname);

const mig = await client.query(
  `SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at NULLS LAST, migration_name`,
);
console.log("MIGRATIONS_APPLIED=", mig.rows.length);
for (const r of mig.rows) console.log("MIG", r.migration_name);

const cols = await client.query(
  `SELECT column_name
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'TournamentTeamPlayer'
   ORDER BY ordinal_position`,
);
console.log(
  "TournamentTeamPlayer_COLS=",
  cols.rows.map((r) => r.column_name).join(","),
);

const dropCandidates = [
  "TimeLimitedQaResponse",
  "TimeLimitedQaFormField",
  "TimeLimitedQaCampaign",
  "MomentsFeaturedImage",
  "MomentsFeaturedDeck",
  "SocialReelPost",
  "GalleryItem",
  "GallerySource",
];

for (const table of dropCandidates) {
  const exists = await client.query(`SELECT to_regclass($1) AS r`, [
    `public.${table}`,
  ]);
  if (!exists.rows[0].r) {
    console.log("TABLE", table, "MISSING");
    continue;
  }
  const cnt = await client.query(
    `SELECT COUNT(*)::int AS c FROM "${table}"`,
  );
  console.log("TABLE", table, "ROWS=", cnt.rows[0].c);
}

const games = await client.query(
  `SELECT COUNT(*)::int AS c FROM "TournamentGame"`,
);
const pubs = await client.query(
  `SELECT COUNT(*)::int AS c FROM "TournamentGame" WHERE status = 'PUBLISHED'`,
);
const teams = await client.query(
  `SELECT COUNT(*)::int AS c FROM "TournamentTeam"`,
);
const players = await client.query(
  `SELECT COUNT(*)::int AS c FROM "TournamentTeamPlayer"`,
);
console.log(
  "SAFE_COUNTS games=",
  games.rows[0].c,
  "published=",
  pubs.rows[0].c,
  "teams=",
  teams.rows[0].c,
  "teamPlayers=",
  players.rows[0].c,
);

await client.end();
console.log("DONE read-only check (no writes).");
