# 🔐 Environment Variables & Secrets Reference Guide

This comprehensive reference document lists all environment variables, API keys, database connection strings, and secrets used across **Daily Love For Jesus** (Web, Backend, and Mobile).

---

## 📌 Quick Summary Table

| Variable Name | Required? | Exposure | Purpose / Description | Where to find it |
| :--- | :---: | :---: | :--- | :--- |
| `SUPABASE_URL` | **Yes** | Public/Server | Supabase project endpoint | [Supabase Dashboard](#1-supabase-configuration) &rarr; Settings &rarr; API |
| `VITE_SUPABASE_URL` | **Yes** | Client (Vite) | Frontend Supabase URL (same as above) | [Supabase Dashboard](#1-supabase-configuration) &rarr; Settings &rarr; API |
| `SUPABASE_ANON_KEY` | **Yes** | Public/Server | Client anonymous access key | [Supabase Dashboard](#1-supabase-configuration) &rarr; Settings &rarr; API |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Client (Vite) | Frontend Anon Key (same as above) | [Supabase Dashboard](#1-supabase-configuration) &rarr; Settings &rarr; API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **SECRET** (Server) | Admin access for sync & bypass RLS | [Supabase Dashboard](#1-supabase-configuration) &rarr; Settings &rarr; API |
| `DATABASE_URL` | **Yes** | **SECRET** (Server) | Supabase Postgres pooled connection | [Supabase Dashboard](#2-database-connection-strings) &rarr; Settings &rarr; Database |
| `NEON_DATABASE_URL` | **Yes** | **SECRET** (Server) | Neon Serverless Postgres connection | [Neon Console](#3-neon-serverless-postgresql) &rarr; Dashboard &rarr; Connection Details |
| `APP_SECRET` | Optional | **SECRET** (Server) | Secret token for sync admin API | Custom random 32-char string |
| `ADMIN_USER_ID` | Optional | Server | UUID of admin user in Supabase Auth | [Supabase Dashboard](#4-admin-access) &rarr; Authentication &rarr; Users |
| `ADMIN_EMAIL` | Optional | Server | Email of admin user | Your personal/admin email |
| `TELEGRAM_BOT_TOKEN` | Optional | **SECRET** (Server) | Telegram bot token for devotional sync | [@BotFather on Telegram](#5-telegram-integration-optional) |
| `TELEGRAM_CHANNEL_ID` | Optional | Server | Devotional Telegram channel ID | Channel info / Forward message |
| `API_BIBLE_KEY` | Optional | **SECRET** (Server) | American Bible Society API Key | [scripture.api.bible](#6-bible-api-integration-optional) |

---

## 1. Supabase Configuration

### Where to obtain:
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (e.g. `daily-love-for-jesus`).
3. In the left sidebar, click the **Settings** gear icon &rarr; **API**.
4. You will see:
   - **Project URL**: Copy this value &rarr; paste into `SUPABASE_URL` and `VITE_SUPABASE_URL`.
   - **Project API Keys**:
     - `anon` / `public`: Copy this value &rarr; paste into `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`.
     - `service_role` / `secret`: Click "Reveal" and copy &rarr; paste into `SUPABASE_SERVICE_ROLE_KEY`.

> [!CAUTION]
> **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in the frontend codebase, Git commits, or mobile bundles. It completely bypasses PostgreSQL Row-Level Security (RLS).

---

## 2. Database Connection Strings

### Supabase PostgreSQL (`DATABASE_URL`)
1. In your Supabase project dashboard, navigate to **Settings** &rarr; **Database**.
2. Scroll to the **Connection string** section.
3. Select the **Transaction Pooler** (recommended for serverless environments like Vercel and Neon sync):
   - Mode: `Transaction` (Port `6543`)
   - URI format:
     ```text
     postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
     ```
4. Replace `[YOUR-PASSWORD]` with your actual database database password.

---

## 3. Neon Serverless PostgreSQL (`NEON_DATABASE_URL`)

Neon provides ultra-fast cold starts and autoscaling serverless Postgres instances, serving as the primary fast data layer for the app.

### Where to obtain:
1. Log in to [Neon Console](https://console.neon.tech).
2. Create or select your project (e.g. `daily-love-for-jesus`).
3. On the project **Dashboard**, locate the **Connection Details** card.
4. Set the dropdown to **Pooled connection** or standard connection.
5. Copy the connection string:
   ```text
   postgresql://neondb_owner:[PASSWORD]@[HOST].neon.tech/neondb?sslmode=require
   ```
6. Set this as `NEON_DATABASE_URL` in your `.env` and Vercel Environment Variables.

---

## 4. Admin Access & Sync Control

- `APP_SECRET`: A high-entropy secret string used to protect admin endpoints such as `/api/sync/run`. Generate one locally:
  ```bash
  openssl rand -hex 32
  ```
- `ADMIN_USER_ID`: The UUID string from Supabase Auth (`auth.users.id`). Any user matching this UUID automatically receives administrative permissions within the app.
- `ADMIN_EMAIL`: Email address (e.g. `admin@yourdomain.com`). Users authenticating with this email are automatically assigned the `admin` role.

---

## 5. Telegram Integration (Optional)

Used to ingest devotionals directly from church Telegram channels into the database.

1. Open Telegram and message **@BotFather**.
2. Run `/newbot`, follow prompts, and copy the HTTP API token &rarr; `TELEGRAM_BOT_TOKEN`.
3. Add the bot as an administrator to your target Telegram Channel.
4. Channel ID can be found by forwarding a message from the channel to `@userinfobot` or `@JsonDumpBot` &rarr; `TELEGRAM_CHANNEL_ID`.

---

## 6. Bible API Integration (Optional)

The application includes built-in offline KJV and connects to the **Bolls Life API** by default without requiring an API key (completely free, covering 50+ languages).

If you wish to use the official American Bible Society collection:
1. Sign up at [scripture.api.bible](https://scripture.api.bible/signup).
2. Generate an API Key under your Developer Applications.
3. Paste the key into `API_BIBLE_KEY`.

---

## 7. Configuring in Vercel

When deploying on Vercel:
1. Go to your project on the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Settings** &rarr; **Environment Variables**.
3. Add each of the following variables for **Production**, **Preview**, and **Development**:
   - `SUPABASE_URL`
   - `VITE_SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `NEON_DATABASE_URL`
   - `APP_SECRET`
   - `ADMIN_USER_ID` / `ADMIN_EMAIL`
4. Trigger a **Redeploy** (or push a commit to `main`).
