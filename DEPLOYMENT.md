# Deployment Guide: Cloudflare Pages & Netlify
**Project:** Daily Love For Jesus  
**Role:** Full-Stack System Engineer Guide  
**Architecture:** React 19 + Vite 7 SPA Frontend, Hono Backend API, Drizzle ORM (Neon / Supabase PostgreSQL)

---

## 1. Economical SaaS Architecture Overview

For maximum cost efficiency and global edge performance:
- **Cloudflare Pages:** Delivers worldwide edge CDN distribution for static assets (`dist/public`), unlimited bandwidth on the free tier, free automatic SSL, and zero cold-start delivery.
- **Netlify:** Provides seamless Git-based CI/CD with automatic PR preview deploys, instant CDN distribution, and integrated Netlify Functions (v2) for Hono serverless endpoints.
- **Data Layer:** Neon Serverless PostgreSQL (primary fast cold-start queries) and Supabase (Auth source-of-truth, storage, and fallback).

Both platforms run on **\$0/month free-tier quotas**, keeping your SaaS operational costs completely lean.

---

## 2. Environment Variables & Secrets Reference

Where to locate and configure every environment variable used by the application:

| Variable Name | Required By | Description | Where to Find / Generate |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Frontend & API | Public HTTPS URL of Supabase | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; API &rarr; Project URL |
| `SUPABASE_URL` | API Backend | Same as `VITE_SUPABASE_URL` | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; API &rarr; Project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend & API | Client-safe anonymous API key | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; API &rarr; `anon` `public` key |
| `SUPABASE_ANON_KEY` | API Backend | Same as `VITE_SUPABASE_ANON_KEY` | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; API &rarr; `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | API Backend | Elevated secret key for admin/background operations | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; API &rarr; `service_role` (Keep Secret!) |
| `DATABASE_URL` | API / Migrations | Supabase PostgreSQL pooled connection URI | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Project Settings &rarr; Database &rarr; Connection String (Port 6543, pooler) |
| `NEON_DATABASE_URL` | API Backend | Neon Serverless PostgreSQL connection string | [Neon Console](https://console.neon.tech) &rarr; Your Project &rarr; Dashboard &rarr; Connection Details |
| `APP_ID` | API Backend | Unique application identifier (e.g. `daily-love-app`) | Custom string (e.g. `daily-love-app`) |
| `APP_SECRET` | API Backend | Cryptographic secret for JWT verification | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_USER_ID` | API Backend | Supabase Auth UUID to grant Admin privileges | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Authentication &rarr; Users &rarr; User UID |
| `ADMIN_EMAIL` | API Backend | Email address granted Admin privileges | Your ministry admin email |
| `API_BIBLE_KEY` | API Backend | *(Optional)* Custom key for scripture lookup | Default is free (Bolls Life API). If using API.Bible: [scripture.api.bible](https://scripture.api.bible) |
| `TELEGRAM_BOT_TOKEN` | API Backend | *(Optional)* Telegram Bot API token for devotional auto-ingest | In Telegram, message [@BotFather](https://t.me/botfather) &rarr; `/newbot` |
| `TELEGRAM_CHANNEL_ID` | API Backend | *(Optional)* Telegram channel ID to synchronize | Channel ID number or `@channelusername` |

> [!NOTE]
> All frontend variables start with `VITE_` so Vite includes them in the client bundle. Backend secrets must **never** be prefixed with `VITE_` so they remain secure on the server side.

---

## 3. Deploying to Netlify

### Option A: Git Integration (Recommended for CI/CD)
1. Push your repository to GitHub / GitLab / Bitbucket.
2. Sign in to [Netlify](https://app.netlify.com).
3. Click **Add new site** &rarr; **Import an existing project** &rarr; Select your Git repository.
4. Netlify will auto-detect the root `netlify.toml` with the following pre-configured settings:
   - **Base directory:** `app`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist/public`
   - **Functions directory:** `netlify/functions`
5. Click **Add environment variables** and enter the variables from the table above (especially `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NEON_DATABASE_URL`, and `APP_SECRET`).
6. Click **Deploy daily-love-for-jesus**.

### Option B: Netlify CLI (Direct / Manual Deployment)
1. Install Netlify CLI globally or use `npx`:
   ```bash
   npm install -g netlify-cli
   ```
2. Authenticate:
   ```bash
   netlify login
   ```
3. Build the application:
   ```bash
   npm run build
   ```
4. Deploy directly to production:
   ```bash
   npm run deploy:netlify
   # or from app folder:
   cd app && npm run deploy:netlify
   ```

---

## 4. Deploying to Cloudflare Pages

### Option A: Git Integration (Recommended)
1. Sign in to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. In the sidebar, navigate to **Compute (Workers & Pages)** &rarr; **Pages** &rarr; **Create a project** &rarr; **Connect to Git**.
3. Select your repository (`daily-love-for-jesus`).
4. Configure Build Settings:
   - **Framework preset:** `Vite` (or None)
   - **Root directory:** `app`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist/public`
5. In **Environment variables**:
   - Add your environment variables (from the table above).
   - Add `NODE_VERSION` = `20`.
6. Under **Settings** &rarr; **Functions** &rarr; **Compatibility flags**:
   - Ensure `nodejs_compat` is added (already configured in `wrangler.toml`).
7. Click **Save and Deploy**.

### Option B: Cloudflare Wrangler CLI (Direct Deployment)
1. Authenticate with Cloudflare:
   ```bash
   npx wrangler login
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy directly to Cloudflare Pages:
   ```bash
   npm run deploy:cloudflare
   # or with project name:
   npx wrangler pages deploy app/dist/public --project-name=daily-love-for-jesus
   ```

---

## 5. Verification & Health Checks

After deploying to either platform:
1. **Frontend Verification:** Open your deployed URL. Verify that the homepage, Bible reader, Devotionals, Hymns, and Settings render cleanly.
2. **SPA Routing Test:** Directly reload a deep link like `/devotionals` or `/bible` in your browser. The `_redirects` rule ensures that `index.html` loads cleanly without a 404 error.
3. **Cache Validation:** Open Developer Tools &rarr; Network tab:
   - JavaScript/CSS files in `/assets/` should return header: `Cache-Control: public, max-age=31536000, immutable`.
   - `index.html` should return header: `Cache-Control: public, max-age=0, must-revalidate`.
4. **API Endpoints:** Test `/api/telegram/webhook` or your tRPC queries to confirm that serverless functions resolve properly.
