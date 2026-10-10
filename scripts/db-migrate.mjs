// Applies pending files in supabase/migrations through the Supabase Management API (HTTPS),
// for environments that can't open a direct Postgres connection (like cloud dev sandboxes).
// Records each one in supabase_migrations.schema_migrations, as `supabase db push` does,
// so the two stay interchangeable.
//
// Usage: node --env-file=.env.local scripts/db-migrate.mjs [--dry-run]
// Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = process.env;
if (!token || !ref) {
  console.error("Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status}: ${body.message ?? JSON.stringify(body)}`);
  return body;
}

const quote = (s) => `'${s.replaceAll("'", "''")}'`;

await sql(`
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (
    version text primary key, statements text[], name text
  );
`);
const applied = new Set((await sql("select version from supabase_migrations.schema_migrations")).map((r) => r.version));

const dir = path.join(import.meta.dirname, "..", "supabase", "migrations");
const files = (await readdir(dir)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
const pending = files.filter((f) => !applied.has(f.split("_")[0]));

if (pending.length === 0) console.log("Database is up to date.");
for (const file of pending) {
  const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
  const name = rest.join("_");
  if (dryRun) {
    console.log(`would apply ${file}`);
    continue;
  }
  const body = await readFile(path.join(dir, file), "utf8");
  // One request runs as one transaction, so a failing migration leaves nothing behind.
  await sql(`${body}
    insert into supabase_migrations.schema_migrations (version, name, statements)
    values (${quote(version)}, ${quote(name)}, array[${quote(body)}]);`);
  console.log(`applied ${file}`);
}
