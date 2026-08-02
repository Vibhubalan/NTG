/**
 * Add any columns that exist on PROD public tables but are missing on DEV.
 * Reads URLs from .env.local (ignores shell env).
 */
import { readFileSync } from "node:fs";
import { Client } from "pg";

function readEnvLocal() {
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

const { prod, dev } = readEnvLocal();
if (!prod || !dev) {
  console.error("Could not resolve prod/dev DIRECT_URL");
  process.exit(1);
}

console.log("Prod:", new URL(prod.replace(/^postgresql:/, "http:")).host);
console.log("Dev: ", new URL(dev.replace(/^postgresql:/, "http:")).host);

const prodClient = new Client({ connectionString: prod, ssl: { rejectUnauthorized: false } });
const devClient = new Client({ connectionString: dev, ssl: { rejectUnauthorized: false } });
await prodClient.connect();
await devClient.connect();

const colsSql = `
  SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.table_name NOT LIKE '_prisma%'
  ORDER BY c.table_name, c.ordinal_position
`;

const prodCols = (await prodClient.query(colsSql)).rows;
const devCols = (await devClient.query(colsSql)).rows;

const devSet = new Set(devCols.map((r) => `${r.table_name}.${r.column_name}`));
const missing = prodCols.filter((r) => !devSet.has(`${r.table_name}.${r.column_name}`));

console.log(`Missing columns on Dev: ${missing.length}`);

function pgType(col) {
  const udt = col.udt_name;
  if (udt === "uuid") return "UUID";
  if (udt === "text") return "TEXT";
  if (udt === "bool") return "BOOLEAN";
  if (udt === "int4") return "INTEGER";
  if (udt === "int8") return "BIGINT";
  if (udt === "float8") return "DOUBLE PRECISION";
  if (udt === "numeric") {
    if (col.numeric_precision && col.numeric_scale != null) {
      return `DECIMAL(${col.numeric_precision},${col.numeric_scale})`;
    }
    return "DECIMAL";
  }
  if (udt === "timestamp") return "TIMESTAMP(3)";
  if (udt === "timestamptz") return "TIMESTAMPTZ(3)";
  if (udt === "jsonb") return "JSONB";
  if (udt === "json") return "JSON";
  if (udt === "varchar") {
    return col.character_maximum_length
      ? `VARCHAR(${col.character_maximum_length})`
      : "VARCHAR";
  }
  // enums / arrays / custom
  if (col.data_type === "USER-DEFINED") return `"${udt}"`;
  if (col.data_type === "ARRAY") return `"${udt.replace(/^_/, "")}"[]`;
  return udt.toUpperCase();
}

let added = 0;
for (const col of missing) {
  // Skip if table itself missing on Dev
  const tableExists = (
    await devClient.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [col.table_name],
    )
  ).rows.length;
  if (!tableExists) {
    console.log(`skip table missing: ${col.table_name}.${col.column_name}`);
    continue;
  }

  let typeSql = pgType(col);
  let nullSql = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
  let defaultSql = col.column_default ? ` DEFAULT ${col.column_default}` : "";

  // Avoid NOT NULL without default on existing rows
  if (col.is_nullable === "NO" && !col.column_default) {
    nullSql = "NULL";
    defaultSql = "";
  }

  const sql = `ALTER TABLE "${col.table_name}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${typeSql} ${nullSql}${defaultSql}`;
  try {
    await devClient.query(sql);
    console.log(`+ ${col.table_name}.${col.column_name} (${typeSql})`);
    added += 1;
  } catch (err) {
    console.error(`! failed ${col.table_name}.${col.column_name}:`, err.message);
    console.error("  sql:", sql);
  }
}

console.log(`\nAdded ${added} columns`);

await prodClient.end();
await devClient.end();
