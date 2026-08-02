import { Client } from "pg";

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL required");
  process.exit(1);
}

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const cols = await c.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Tournament'
  ORDER BY ordinal_position
`);
console.log("Tournament columns:", cols.rows.map((r) => r.column_name).join(", "));

const needed = ["coCaptainSlots", "auctionStartsAt", "auctionEndsAt", "startingBudget", "publicAuction"];
for (const name of needed) {
  const hit = cols.rows.some((r) => r.column_name === name);
  console.log(`${hit ? "OK" : "MISSING"} ${name}`);
}

const mig = await c.query(`SELECT migration_name FROM _prisma_migrations ORDER BY finished_at`);
console.log("migrations:", mig.rows.length);

await c.end();
