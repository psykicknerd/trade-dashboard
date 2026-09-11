import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set before the database layer can start.",
  );
}

const isLocalhost =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (!isLocalhost && process.env.DATABASE_SSL !== "false");

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
