# 🚀 Enterprise SaaS Deployment Guide: Daily Love For Jesus
**Architecture:** React 19 + Vite 7 SPA Frontend | NestJS Modular Enterprise API Backend | React Native / Expo Mobile App | Neon + Supabase Dual PostgreSQL  
**Runtime:** Node.js `>=20.18.0 <=24.x.x` (Target: **Node.js v24.21.0**, npm `>=10.0.0`)  
**Cost Profile:** **$0 - $5/month** on high-availability free tier  

---

## 1. 🏗️ High-Level System Architecture

```
                          ┌──────────────────────────────────────┐
                          │   Client Platforms (Cross-Platform)  │
                          ├──────────────────┬───────────────────┤
                          │  Vite React SPA  │  Expo Mobile App  │
                          │ (Web & Desktop)  │  (iOS & Android)  │
                          └─────────┬────────┴─────────┬─────────┘
                                    │                  │
                         HTTPS/WSS  │                  │  REST/tRPC
                                    ▼                  ▼
                          ┌──────────────────────────────────────┐
                          │    NestJS Modular Enterprise API     │
                          │   (Auth, Bible, Hymns, Devotional,   │
                          │    Community, Telegram, Drizzle ORM) │
                          └──────────────────┬───────────────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   ▼                                                   ▼
     ┌───────────────────────────┐                       ┌───────────────────────────┐
     │ Neon Serverless Postgres  │                       │    Supabase PostgreSQL    │
     │  - High-speed cold starts │                       │  - Auth Source of Truth   │
     │  - Primary DB / Drizzle   │                       │  - Storage & Replication  │
     └───────────────────────────┘                       └───────────────────────────┘
```

---

## 2. 🔐 Environment Variables & Secrets Reference

Per project security standards, here is the exact inventory of every configuration key, its scope, and exactly where to obtain it:

### File Locations:
- **Backend Environment:** `backend/.env` (Template: [`backend/.env.example`](backend/.env.example))
- **Frontend Environment:** `app/.env` (Template: [`app/.env.example`](app/.env.example))
- **Mobile Environment:** `mobile/.env` (Template: [`mobile/.env.example`](mobile/.env.example))
- **Root Fallback:** `.env` (Template: [`.env.example`](.env.example))

### Complete Key Reference:

| Variable Name | Required By | Scope | Description & Purpose | Where to Obtain / Generate |
| :--- | :---: | :---: | :--- | :--- |
| `PORT` | Backend | Server | Port for the NestJS HTTP listener (defaults to `4000`). | Set by hosting provider or `.env`. |
| `NODE_ENV` | Backend / Web | Shared | Deployment mode (`production` or `development`). | Set to `production` in deployment dashboards. |
| `FRONTEND_URL` | Backend | Server | Allowed CORS origin for web app (e.g. `https://dailylove.netlify.app`). | Your production frontend URL. |
| `VITE_API_URL` | Frontend | Client | Public base URL pointing to the deployed NestJS API. | Your production backend URL (e.g. `https://api.dailylove.railway.app`). |
| `VITE_SUPABASE_URL` | Frontend | Client | Public HTTPS endpoint for Supabase Auth client. | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Settings &rarr; API &rarr; Project URL. |
| `SUPABASE_URL` | Backend | Server | Same as `VITE_SUPABASE_URL`. | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Settings &rarr; API &rarr; Project URL. |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Client | Anonymous public key for frontend Supabase operations. | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Settings &rarr; API &rarr; `anon` `public` key. |
| `SUPABASE_ANON_KEY` | Backend | Server | Same as `VITE_SUPABASE_ANON_KEY`. | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Settings &rarr; API &rarr; `anon` `public` key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | **SECRET** | Elevated service role key for bypass RLS and admin tasks. | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Settings &rarr; API &rarr; `service_role` (Never expose to client!). |
| `NEON_DATABASE_URL` | Backend | **SECRET** | Connection string for Neon Serverless PostgreSQL. | [Neon Console](https://console.neon.tech) &rarr; Select Project &rarr; Dashboard &rarr; Connection Details. |
| `DATABASE_URL` | Backend | **SECRET** | Supabase Postgres connection string (port 6543 pooler). | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Settings &rarr; Database &rarr; Connection String. |
| `APP_SECRET` | Backend | **SECRET** | Cryptographic random secret for session signing & admin API. | Generate via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `APP_ID` | Backend | Server | Unique SaaS identifier (e.g. `daily-love-app`). | Custom identifier string. |
| `ADMIN_USER_ID` | Backend | Server | Supabase Auth UUID to grant Admin privileges automatically. | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Authentication &rarr; Users &rarr; User UID. |
| `ADMIN_EMAIL` | Backend | Server | Admin email address automatically granted admin role. | Your ministry administrator email. |
| `API_BIBLE_KEY` | Backend | Optional | American Bible Society API Key for custom translations. | [scripture.api.bible](https://scripture.api.bible/signup) (Default uses free Bolls Life API). |
| `TELEGRAM_BOT_TOKEN` | Backend | Optional | Telegram Bot token for devotional auto-ingestion. | Message [@BotFather](https://t.me/botfather) &rarr; `/newbot`. |
| `TELEGRAM_CHANNEL_ID` | Backend | Optional | Telegram Channel identifier to synchronize messages. | Channel username or forward message to `@userinfobot`. |
| `EXPO_PUBLIC_API_URL` | Mobile App | Client | Base API URL pointing to the NestJS API. | Deployed backend URL (e.g. `https://api.dailylove.railway.app`). |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile App | Client | Mobile client Supabase URL. | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Settings &rarr; API. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile App | Client | Mobile client Supabase anon key. | [Supabase Dashboard](https://supabase.com/dashboard) &rarr; Settings &rarr; API. |

---

## 3. 🌐 Frontend SPA Deployment (Vite + React 19)

The frontend compiles to static HTML, CSS, and hashed JavaScript assets inside `app/dist/public`. It can be hosted for **$0/month** on Netlify, Cloudflare Pages, or Vercel.

### Provider A: Netlify (Pre-Configured via `netlify.toml`)
1. Push your repository to GitHub.
2. Sign in to [Netlify](https://app.netlify.com) &rarr; **Add new site** &rarr; **Import an existing project**.
3. Select your repository (`daily-love-for-jesus`).
4. Netlify will auto-detect the root [`netlify.toml`](netlify.toml) settings:
   - **Base directory:** `app`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist/public`
   - **Node.js Version:** `24.21.0`
5. Configure Environment Variables in Netlify:
   - `VITE_API_URL` = `https://your-backend-domain.com`
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
6. Click **Deploy**. SPA routing and immutable cache headers will apply automatically.

### Provider B: Cloudflare Pages
1. Sign in to [Cloudflare Dashboard](https://dash.cloudflare.com) &rarr; **Compute (Workers & Pages)** &rarr; **Pages** &rarr; **Create a project**.
2. Connect your Git repository.
3. Build Configuration:
   - **Framework Preset:** `Vite`
   - **Root directory:** `app`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist/public`
4. In **Environment Variables**, set:
   - `NODE_VERSION` = `24.21.0`
   - `VITE_API_URL` = `https://your-backend-domain.com`
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
5. Click **Save and Deploy**.

### Provider C: Vercel (Pre-Configured via `vercel.json`)
1. Sign in to [Vercel](https://vercel.com) &rarr; **Add New Project** &rarr; Import Git repository.
2. Root [`vercel.json`](vercel.json) automatically instructs Vercel:
   - **Build Command:** `npm run build:frontend`
   - **Output Directory:** `app/dist/public`
3. Add environment variables: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy!

---

## 4. ⚙️ Backend Deployment (NestJS on Node.js 24)

The NestJS backend runs on port `4000` (or `process.env.PORT`). It provides REST endpoints, Swagger OpenAPI docs at `/api/docs`, and tRPC endpoints at `/api/trpc`.

### Option A: Railway (Recommended - Instant One-Click)
1. Sign in to [Railway.app](https://railway.app).
2. Click **New Project** &rarr; **Deploy from GitHub repo**.
3. In Service Settings:
   - **Build Command:** `npm --prefix backend install --legacy-peer-deps && npm --prefix backend run build`
   - **Start Command:** `npm --prefix backend run start:prod`
   - Or deploy via the included [`backend/Dockerfile`](backend/Dockerfile).
4. Add all Backend Environment Variables (from Section 2).
5. Generate a public domain (e.g. `https://daily-love-backend.up.railway.app`).
6. Verify live health at `https://your-railway-app.up.railway.app/api/sync/health` and docs at `/api/docs`.

### Option B: Render (Free Web Service)
1. Sign in to [Render.com](https://render.com) &rarr; **New Web Service**.
2. Connect your GitHub repository.
3. Settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm --prefix backend install --legacy-peer-deps && npm --prefix backend run build`
   - **Start Command:** `npm --prefix backend run start:prod`
4. Under **Advanced**, add `NODE_VERSION` = `24.21.0`.
5. Enter your environment variables (`NEON_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_SECRET`).
6. Deploy!

### Option C: Fly.io (Docker Deployment)
1. Install Fly CLI: `winget install flyctl` or `curl -L https://fly.io/install.sh | sh`
2. Authenticate: `fly auth login`
3. Launch app using the root docker context and [`backend/Dockerfile`](backend/Dockerfile):
   ```bash
   fly launch --dockerfile backend/Dockerfile
   ```
4. Set production secrets:
   ```bash
   fly secrets set NEON_DATABASE_URL="postgresql://..." SUPABASE_URL="https://..." SUPABASE_SERVICE_ROLE_KEY="..." APP_SECRET="..."
   ```
5. Deploy:
   ```bash
   fly deploy
   ```

### Option D: Ubuntu / Self-Hosted VPS (Docker Compose)
Deploy on any VPS (Hetzner, DigitalOcean, AWS EC2) using the pre-configured [`docker-compose.yml`](docker-compose.yml):
```bash
# 1. Clone repository
git clone https://github.com/gideonayanwale/daily-love-for-jesus.git
cd daily-love-for-jesus

# 2. Configure environment
cp backend/.env.example backend/.env
nano backend/.env

# 3. Build & start container
docker-compose up -d --build

# 4. View logs
docker-compose logs -f
```

---

## 5. 📱 Mobile App Deployment (Expo & React Native)

The mobile application is powered by Expo SDK 52.

### Local Development:
```bash
npm run install:mobile
cd mobile
npx expo start
```
- Press `a` for Android emulator (connects to `http://10.0.2.2:4000`).
- Press `i` for iOS simulator (connects to `http://localhost:4000`).
- Scan QR code using **Expo Go** on physical device (set `EXPO_PUBLIC_API_URL` to your LAN IP or deployed backend).

### Production Distribution with EAS:
1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Build Android Standalone APK / Google Play AAB:
   ```bash
   cd mobile
   eas build --platform android --profile production
   ```
3. Build iOS Application:
   ```bash
   cd mobile
   eas build --platform ios --profile production
   ```

---

## 6. 🩺 Verification & Health Checks

After deploying, verify the complete stack:

| Check | URL / Command | Expected Response |
| :--- | :--- | :--- |
| **Backend Health** | `GET /api/sync/health` | `{"status":"ok","timestamp":"...","database":{"neon":"connected"}}` |
| **Interactive API Docs**| `GET /api/docs` | Swagger OpenAPI UI rendering all modules & endpoints |
| **Devotionals API** | `GET /api/devotionals/today` | Today's devotional JSON object |
| **Hymns API** | `GET /api/hymns?limit=5` | Array of hymn lyrics and metadata |
| **Bible API** | `GET /api/bible/random?translation=KJV` | Random scripture verse |
| **Frontend SPA** | `https://your-frontend.com` | Instant React 19 app load, responsive layout, dark/light theme |
| **SPA Deep Links** | `https://your-frontend.com/devotionals` | Direct load without 404 error |

---

## 7. 🛡️ Security & Zero-Downtime Maintenance

1. **Database Cold Start Resilience:** The NestJS backend gracefully handles Neon cold-starts and retries database connections automatically.
2. **CORS Whitelist:** Ensure `FRONTEND_URL` in `backend/.env` matches your deployed frontend domain so browser sessions and cookies are allowed.
3. **Admin Token Rotation:** Rotate `APP_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` periodically in your cloud provider's dashboard without changing code.
