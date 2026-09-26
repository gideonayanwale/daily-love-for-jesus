import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Target selector: DRIZZLE_DB_TARGET="supabase" | "neon" | auto
const target = process.env.DRIZZLE_DB_TARGET;

let connectionString: string | undefined;
let dbName = "Neon";

if (target === "supabase") {
  connectionString = process.env.DATABASE_URL;
  dbName = "Supabase";
} else if (target === "neon") {
  connectionString = process.env.NEON_DATABASE_URL;
  dbName = "Neon";
} else {
  connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  dbName = process.env.NEON_DATABASE_URL ? "Neon" : "Supabase";
}

if (!connectionString) {
  throw new Error(
    `Database connection string not found for target '${dbName}'. Check NEON_DATABASE_URL and DATABASE_URL in .env`
  );
}

console.log(`[drizzle-kit] Using ${dbName} database for migrations/push`);

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
