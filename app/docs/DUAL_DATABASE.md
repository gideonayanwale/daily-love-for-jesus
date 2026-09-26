# Dual Database Architecture — Supabase + Neon

## Overview

This project uses **two PostgreSQL databases** that work together:

| Database | Role | Why |
|---|---|---|
| **Supabase** | Auth, Realtime, Storage | GoTrue auth, Row-Level Security, realtime subscriptions |
| **Neon** | Primary App Data | Faster serverless cold-starts, HTTP driver, branching for dev |

Both share the **exact same Drizzle ORM schema** (`db/schema.ts`), so all queries work identically against either database.

---

## Architecture Flow

```
Mobile App / Web Browser
        │
        ▼
   Supabase Auth ──────► Issues JWT token
        │
        ▼
  Hono API Server
        │
        ├── Reads/Writes ──► Neon (Primary — fast HTTP driver)
        │                         │
        │                         └── Falls back to Supabase Postgres if Neon unavailable
        │
        ├── Auth verification ──► Supabase GoTrue API
        │
        └── Sync Engine ──► Syncs users & data between both DBs
```

---

## Connection Priority

The `getDb()` function in `api/lib/db.ts` selects the database in this order:

1. **Neon** — if `NEON_DATABASE_URL` is set ✅ (primary)
2. **Supabase PostgreSQL** — if `DATABASE_URL` is set (fallback)
3. **Dev stub** — graceful no-op for local dev without any DB

---

## Environment Variables

> **File:** `app/.env`

```env
# Supabase (Auth + Realtime + Storage)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Supabase PostgreSQL (fallback / migrations)
DATABASE_URL=postgresql://postgres.ref:pass@pooler.supabase.com:6543/postgres?sslmode=require

# Neon Serverless PostgreSQL (PRIMARY app data DB)
# Get from: https://console.neon.tech → your project → Connection Details
NEON_DATABASE_URL=postgresql://neondb_owner:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## Sync Engine

The sync engine in `api/lib/dbSync.ts` handles bidirectional replication.

### Table Sync Directions

| Table | Direction | Notes |
|---|---|---|
| `users` | Supabase → Neon | Auth truth in Supabase |
| `devotionals` | Bidirectional | Content created on either side |
| `communities` | Bidirectional | Multi-tenant church data |
| `bible_books` | Supabase → Neon | Static reference data |
| `hymns` | Supabase → Neon | Static reference data |

### Trigger Sync via API

All sync endpoints require the `x-admin-secret` header (your `APP_SECRET`).

```bash
# Health check — are both DBs reachable?
curl -H "x-admin-secret: YOUR_APP_SECRET" http://localhost:3000/api/sync/health

# Full bidirectional sync
curl -X POST -H "x-admin-secret: YOUR_APP_SECRET" http://localhost:3000/api/sync/run

# One-way: Supabase → Neon
curl -X POST -H "x-admin-secret: YOUR_APP_SECRET" http://localhost:3000/api/sync/supabase-to-neon

# One-way: Neon → Supabase
curl -X POST -H "x-admin-secret: YOUR_APP_SECRET" http://localhost:3000/api/sync/neon-to-supabase
```

---

## Schema Migrations

Drizzle Kit automatically picks up Neon if `NEON_DATABASE_URL` is set:

```bash
# Push schema to Neon (default when NEON_DATABASE_URL is set)
npm run db:push

# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate
```

To migrate Supabase instead, temporarily unset `NEON_DATABASE_URL` or run the schema SQL directly from Supabase Dashboard.

---

## Adding a New Sync Table

Edit `api/lib/dbSync.ts` → `SYNC_TABLES` array:

```ts
{
  table: schema.myNewTable,
  name: "my_new_table",
  direction: "bidirectional",  // or "supabase→neon" / "neon→supabase"
  conflictColumn: "id",
  updatedAtColumn: "updated_at",
}
```

---

## User Sync Flow

When a user signs in via Supabase Auth, the `syncUserToAllDbs()` function in `api/lib/dbSync.ts` mirrors their record to both databases:

```
Supabase Auth Sign-In
        │
        ▼
 syncUserToAllDbs(authUser)
        │
        ├── INSERT/UPSERT → Neon users table
        └── INSERT/UPSERT → Supabase users table
```

Call this from `auth-router.ts` after successful token verification.
