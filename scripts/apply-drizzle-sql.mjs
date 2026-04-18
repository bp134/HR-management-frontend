import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/apply-drizzle-sql.mjs <sql-file>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = await fs.readFile(filePath, "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map(part => part.trim())
  .filter(Boolean);

const connection = await mysql.createConnection(url);

for (const statement of statements) {
  const normalized = statement.replace(/;\s*$/, "");
  if (!normalized) continue;
  console.log(`Applying: ${normalized.split("\n")[0].slice(0, 120)}`);
  await connection.query(normalized);
}

await connection.end();
console.log("Migration applied successfully.");
