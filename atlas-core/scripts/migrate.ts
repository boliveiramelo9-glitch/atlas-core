import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não configurada.");

const sql = await readFile(
  resolve("database/migrations/001_initial.sql"),
  "utf8",
);
const client = new pg.Client({
  connectionString,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

await client.connect();
try {
  await client.query(sql);
  console.log("Migração aplicada com sucesso.");
} finally {
  await client.end();
}
