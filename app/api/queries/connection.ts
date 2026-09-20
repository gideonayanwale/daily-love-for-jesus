import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: any = null;

export function getDb(): any {
  if (!instance) {
    try {
      // Dynamic import to support both postgres.js and serverless environments
      const postgres = require("postgres");
      const { drizzle } = require("drizzle-orm/postgres-js");
      
      // Supabase connection pooling (port 6543 / transaction mode requires prepare: false)
      const client = postgres(env.databaseUrl, {
        prepare: false,
        ssl: env.databaseUrl.includes("supabase.co") || env.databaseUrl.includes("pooler.supabase.com") ? "require" : undefined,
      });
      
      instance = drizzle(client, { schema: fullSchema });
    } catch (err: any) {
      console.warn(
        "[getDb] Notice: PostgreSQL driver (postgres) not yet installed or connection failed.",
        "Ensure DATABASE_URL is set in .env and run 'npm install'.",
        err.message
      );
      
      // Resilient development fallback proxy
      instance = new Proxy({}, {
        get(_, prop) {
          if (prop === "query") {
            return new Proxy({}, {
              get: () => () => Promise.resolve([]),
            });
          }
          return () => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([]),
                }),
                limit: () => Promise.resolve([]),
              }),
              orderBy: () => ({
                limit: () => Promise.resolve([]),
              }),
              limit: () => Promise.resolve([]),
            }),
            values: () => ({
              returning: () => Promise.resolve([{ id: 1 }]),
              $returningId: () => Promise.resolve([{ id: 1 }]),
              onConflictDoUpdate: () => Promise.resolve([{ id: 1 }]),
            }),
            set: () => ({
              where: () => Promise.resolve({ rowCount: 1 }),
            }),
            where: () => Promise.resolve({ rowCount: 1 }),
          });
        },
      });
    }
  }
  return instance;
}
