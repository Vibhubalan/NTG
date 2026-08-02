/**
 * Copy public schema data from prod → Dev.
 * Reads URLs from .env.local (ignores shell env). Expects schemas already aligned.
 */
import { readFileSync } from "node:fs";
import { Client } from "pg";

function parseEnvLocal() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const prodMatch = text.match(/#PROD[\s\S]*?# DIRECT_URL=(.+)/);
  const prod = prodMatch?.[1]?.trim();
  let dev = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("#")) continue;
    const m = line.match(/^DIRECT_URL=(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    dev = v;
    break;
  }
  return { prod, dev };
}

const { prod: PROD, dev: DEV } = parseEnvLocal();
if (!PROD || !DEV) {
  console.error("Could not resolve prod/dev DIRECT_URL from .env.local");
  process.exit(1);
}

console.log("Source (prod):", new URL(PROD.replace(/^postgresql:/, "http:")).host);
console.log("Target (dev): ", new URL(DEV.replace(/^postgresql:/, "http:")).host);

async function listPublicTables(client) {
  const { rows } = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename
  `);
  return rows.map((r) => r.tablename);
}

async function tableExists(client, table) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
    [table],
  );
  return rows.length > 0;
}

async function countRows(client, table) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  return rows[0].c;
}

const prod = new Client({ connectionString: PROD, ssl: { rejectUnauthorized: false } });
const dev = new Client({ connectionString: DEV, ssl: { rejectUnauthorized: false } });
await prod.connect();
await dev.connect();

try {
  const prodTables = await listPublicTables(prod);
  const shared = [];
  for (const t of prodTables) {
    if (await tableExists(dev, t)) shared.push(t);
    else console.log(`skip (not on dev): ${t}`);
  }

  console.log(`\nCopying ${shared.length} tables…\n`);
  await dev.query("SET session_replication_role = replica");

  const truncateList = shared.map((t) => `"${t}"`).join(", ");
  await dev.query(`TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`);
  console.log("Truncated all shared tables on dev.\n");

  const summary = [];
  for (const table of shared) {
    const prodCount = await countRows(prod, table);
    if (prodCount === 0) {
      summary.push({ table, prod: 0, dev: 0 });
      console.log(`✓ ${table}: empty`);
      continue;
    }

    const { rows } = await prod.query(
      `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS data FROM "${table}" t`,
    );
    const payload = rows[0].data;
    const json = typeof payload === "string" ? payload : JSON.stringify(payload);

    await dev.query(
      `INSERT INTO "${table}" SELECT * FROM json_populate_recordset(NULL::"${table}", $1::json)`,
      [json],
    );

    const devCount = await countRows(dev, table);
    const ok = prodCount === devCount;
    summary.push({ table, prod: prodCount, dev: devCount });
    console.log(`${ok ? "✓" : "✗"} ${table}: prod=${prodCount} → dev=${devCount}`);
  }

  await dev.query("SET session_replication_role = DEFAULT");

  const mismatches = summary.filter((s) => s.prod !== s.dev);
  console.log("\n--- Summary ---");
  console.log(`Tables copied: ${summary.length}`);
  console.log(`Row mismatches: ${mismatches.length}`);
  if (mismatches.length) {
    for (const m of mismatches) console.log(`  ${m.table}: prod=${m.prod} dev=${m.dev}`);
    process.exitCode = 1;
  } else {
    console.log("All row counts match.");
  }
} finally {
  await prod.end().catch(() => {});
  await dev.end().catch(() => {});
}
