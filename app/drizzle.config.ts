import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Priority: Neon (faster) → Supabase fallback
const connectionString =
  process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Either NEON_DATABASE_URL or DATABASE_URL is required to run drizzle commands"
  );
}

console.log(
  `[drizzle-kit] Using ${process.env.NEON_DATABASE_URL ? "Neon" : "Supabase"} database for migrations`
);

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
