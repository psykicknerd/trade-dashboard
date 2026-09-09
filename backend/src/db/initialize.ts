import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const schemaPath = fileURLToPath(new URL("./schema.sql", import.meta.url));

async function initializeDatabase() {
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
  console.log("Database schema initialized.");
}

initializeDatabase()
  .catch((error: unknown) => {
    console.error("Database initialization failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
