// Usage: npm run db:setup   (reads DATABASE_URL from .env.local)
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}
const sql = neon(url);

async function runFile(path: string) {
  // ponytail: naive split on ";" works because our SQL files have no functions or ";" inside strings.
  const statements = readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) await sql.query(statement);
  console.log(`ok  ${path} (${statements.length} statements)`);
}

// No top-level await: tsx compiles this file as CommonJS, which doesn't support it.
async function main() {
  await runFile("db/schema.sql");
  await runFile("db/seed.sql");
}

main().catch((error) => {
  console.error("Database setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
