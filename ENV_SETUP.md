# Environment Variables & Secrets Reference Guide

This document details every environment variable used across the **Daily Love For Jesus** NestJS backend and React frontend, where to obtain each API key/secret, and how they are loaded.

---

## 📁 File Locations

The application checks for environment variables in the following files:
1. `backend/.env` — Backend local environment variables (loaded by NestJS `ConfigModule`).
2. `.env` (project root) — Fallback for backend and root scripts.
3. `app/.env` — Frontend React/Vite environment variables (only variables prefixed with `VITE_` are bundled into browser code).

Templates available:
- [`.env.example`](file:///c:/Users/ayanw/Documents/Web%20Projects/Daily%20Love%20For%20Jesus/.env.example) (Root template)
- [`backend/.env.example`](file:///c:/Users/ayanw/Documents/Web%20Projects/Daily%20Love%20For%20Jesus/backend/.env.example) (Backend template)
- [`app/.env.example`](file:///c:/Users/ayanw/Documents/Web%20Projects/Daily%20Love%20For%20Jesus/app/.env.example) (Frontend template)

---

## 🔑 Keys and Secrets Inventory

| Variable | Scope | Required? | Where to find / How to obtain |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend | Optional (Default: `4000`) | Port on which the NestJS server listens. |
| `NODE_ENV` | Backend | Optional (`development`/`production`) | Controls static file serving and error formatting. |
| `FRONTEND_URL` | Backend | Optional (Default: `http://localhost:3000`) | Allowed CORS origin for the React SPA. |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Both | Required for Auth | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; API &rarr; Project URL. |
| `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` | Both | Required for Auth | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; API &rarr; Project API keys (`anon` / `public`). Safe for client-side use. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend ONLY | Optional (Recommended) | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; API &rarr; `service_role` (secret). **NEVER expose in frontend or git commits.** Enables admin user verification and role elevation. |
| `DATABASE_URL` | Backend ONLY | Optional / Dual DB | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; Database &rarr; Connection string (Transaction Pooler port `6543`). |
| `NEON_DATABASE_URL` | Backend ONLY | Recommended | [Neon Console](https://console.neon.tech) &rarr; Dashboard &rarr; Connection Details. High-speed serverless PostgreSQL used for Drizzle ORM operations. |
| `APP_ID` | Backend | Optional (Default: `daily-love-app`) | Application identifier for internal token generation. |
| `APP_SECRET` | Backend | Recommended | Strong random secret string used to sign session cookies and verify `x-admin-secret` API headers. |
| `ADMIN_USER_ID` | Backend | Optional | Supabase User UUID (from Supabase Auth table) to automatically grant the `admin` role upon sign-in. |
| `ADMIN_EMAIL` | Backend | Optional | Email address (e.g. `pastor@dailyloveforjesus.org`) automatically granted the `admin` role upon sign-in. |
| `API_BIBLE_KEY` | Backend | Optional | [American Bible Society API.Bible](https://scripture.api.bible/signup). Default Bible engine uses Bolls Life API (completely free, 50+ translations, 0 keys needed). |
| `TELEGRAM_BOT_TOKEN` | Backend | Optional | Generated via [@BotFather](https://t.me/BotFather) on Telegram for automated channel message ingestion. |
| `TELEGRAM_CHANNEL_ID` | Backend | Optional | The Telegram channel ID (e.g. `@dailyloveforjesus` or `-100xxxxxx`) from which devotionals are ingested. |

---

## 🛡️ Security Best Practices

1. **Client-side isolation**: Only keys prefixed with `VITE_` are bundled into frontend code. Never prefix `SUPABASE_SERVICE_ROLE_KEY`, `APP_SECRET`, or database connection strings with `VITE_`.
2. **Local Fallback Mode**: If Supabase or Neon credentials are not yet configured in development, the NestJS backend automatically defaults to a mock admin user (`Developer Mode`) and a resilient dev stub proxy, allowing you to develop and test UI features offline.
