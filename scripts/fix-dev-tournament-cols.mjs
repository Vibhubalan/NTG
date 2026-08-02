import { readFileSync } from "node:fs";
import { Client } from "pg";

function readEnvLocal(key) {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("#")) continue;
    const m = line.match(new RegExp(`^${key}=(.*)$`));
    if (!m) continue;
    let v = m[1].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return null;
}

const url = readEnvLocal("DIRECT_URL");
if (!url) {
  console.error("DIRECT_URL not found in .env.local");
  process.exit(1);
}

const host = new URL(url.replace(/^postgresql:/, "http:")).host;
console.log("Connecting to:", host);

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const before = await c.query(`
  SELECT COUNT(*)::int AS n
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='Tournament' AND column_name='coCaptainSlots'
`);
console.log("coCaptainSlots before:", before.rows[0].n);

await c.query(`
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "coCaptainSlots" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "startingBudget" INTEGER NOT NULL DEFAULT 150;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "rosterSize" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "minBidIncrement" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "auctionStartsAt" TIMESTAMP(3);
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "auctionEndsAt" TIMESTAMP(3);
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "groupCount" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "teamsPerGroup" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "advancePerGroup" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "rankPoints" JSONB;
`);

const after = await c.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='Tournament'
    AND column_name IN (
      'coCaptainSlots','auctionStartsAt','auctionEndsAt','startingBudget',
      'rosterSize','minBidIncrement','groupCount','teamsPerGroup','advancePerGroup','rankPoints'
    )
  ORDER BY 1
`);
console.log(
  "Present after:",
  after.rows.map((r) => r.column_name).join(", "),
);

const mig = await c.query(`SELECT COUNT(*)::int AS n FROM _prisma_migrations`);
console.log("migrations on this DB:", mig.rows[0].n);

await c.end();
