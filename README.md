# Daily Love For Jesus ✝️

> **Daily Devotional & Spiritual Growth Platform by Love Fellowship Christian International**  
> A high-performance, economical full-stack SaaS platform providing daily devotionals, offline-ready scriptures, Christian hymns, community discussions, and automated sermon sync.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.21.0-brightgreen.svg)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/backend-NestJS%2010-ea2845.svg)](https://nestjs.com)
[![React](https://img.shields.io/badge/frontend-React%2019%20+%20Vite%207-61dafb.svg)](https://react.dev)
[![Expo](https://img.shields.io/badge/mobile-Expo%20SDK%2052-000020.svg)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)

---

## 🏛️ Monorepo Architecture

This monorepo is engineered as an economical, enterprise-grade spiritual platform divided into three main workspaces:

```
daily-love-for-jesus/
├── backend/            # Modular NestJS Backend (Node.js 24)
│   ├── src/modules/    # Auth, Bible, Hymns, Devotionals, Community, Telegram, Sync, tRPC
│   ├── src/database/   # Drizzle ORM schema, dual Neon + Supabase connection
│   └── Dockerfile      # Production multi-stage Node 24 Alpine container
│
├── app/                # Frontend Web Application (React 19 + Vite 7 + Tailwind CSS)
│   ├── src/pages/      # Bible Reader, Daily Devotionals, Hymns, Community, Settings
│   ├── src/components/ # Modern high-aesthetic UI components & navigation
│   └── dist/public/    # Production static build output
│
├── mobile/             # Cross-Platform Mobile Application (Expo SDK 52 + React Native)
│   ├── src/screens/    # Native screens with offline caching
│   └── src/lib/        # Mobile API client communicating with NestJS backend
│
├── docs/               # Technical references & Scripture engine specifications
├── DEPLOYMENT.md       # Definitive Production Deployment Guide (Netlify, Cloudflare, Railway, Docker)
├── ENV_SETUP.md        # Complete Environment Variables & Secrets Reference
└── UPGRADE_GUIDE.md    # Node.js 24 runtime upgrade & dependency management guide
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: `v24.21.0` (LTS/Current, `>=20.18.0 <=24.x.x`)
- **npm**: `>=10.0.0`
- *(Optional)* **Docker**: For running containerized backend services

### 1. Install Dependencies
Install dependencies across root, backend, frontend, and mobile workspaces:
```bash
npm run install:all
```

### 2. Configure Environment Files
Set up your local environment files using the provided templates:
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp app/.env.example app/.env

# Mobile
cp mobile/.env.example mobile/.env
```
👉 *For complete details on obtaining free database and auth keys, see [`ENV_SETUP.md`](ENV_SETUP.md).*

### 3. Start Development Servers
Start both the NestJS API server (`http://localhost:4000`) and the Vite React frontend (`http://localhost:3000`) concurrently in a single terminal:
```bash
# Run both Backend and Frontend together
npm run dev
# (or npm run dev:all)
```

Or run them in separate terminals:
```bash
# Terminal 1: NestJS Backend (watches and auto-reloads)
npm run dev:backend

# Terminal 2: Vite React Frontend (proxies /api to NestJS)
npm run dev:frontend
```

To run the mobile app on Android or iOS:
```bash
# Terminal 3: Expo Dev Server
npm --prefix mobile run start
```

---

## 🛠️ Monorepo Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` / `npm run dev:all` | Runs both NestJS backend and Vite frontend concurrently with unified logging. |
| `npm run dev:backend` | Starts NestJS API server in watch mode with TypeScript execution (`tsx`). |
| `npm run dev:frontend`| Starts Vite React development server on port 3000 with `/api` proxy. |
| `npm run build` | Compiles both NestJS backend (`tsc`) and Vite frontend (`dist/public`). |
| `npm run build:backend` | Compiles backend TypeScript to production `backend/dist`. |
| `npm run build:frontend`| Builds and bundles frontend assets to `app/dist/public`. |
| `npm run test` | Runs backend and frontend test suites. |
| `npm run check` | Runs strict TypeScript type-checking across all monorepo workspaces. |
| `npm run deploy:netlify` | Deploys static frontend build to Netlify production. |
| `npm run deploy:cloudflare` | Deploys static frontend build to Cloudflare Pages. |

---

## 📖 Interactive API Documentation

Once the backend is running, open your browser to inspect the interactive Swagger OpenAPI documentation:
- **Swagger UI**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **tRPC Endpoint**: `http://localhost:4000/api/trpc`
- **Health Check**: [http://localhost:4000/api/sync/health](http://localhost:4000/api/sync/health)

---

## 🚢 Deployment Guide

The platform is designed to run for **$0 - $5/month** on high-availability free tiers:
- **Frontend SPA**: Netlify, Cloudflare Pages, or Vercel
- **NestJS Backend**: Railway, Render, Fly.io, or any self-hosted VPS via `docker-compose.yml`
- **Databases**: Neon Serverless PostgreSQL (instant queries) + Supabase (Auth & Storage)
- **Mobile**: Standalone APK/AAB and iOS builds via Expo Application Services (EAS)

👉 *Read the full step-by-step instructions in [`DEPLOYMENT.md`](DEPLOYMENT.md).*

---

## 🔐 Environment Variables & Security

All secrets and credentials are fully isolated:
- Frontend code only accesses variables prefixed with `VITE_`.
- Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `NEON_DATABASE_URL`, `APP_SECRET`) remain exclusively on the backend and are never committed to Git.

👉 *See [`ENV_SETUP.md`](ENV_SETUP.md) for the complete table of secrets and where to find them.*

---

## 📄 License & Author

- **Author**: Gideon Inioluwa Ayanwale
- **Ministry**: Love Fellowship Christian International
- **License**: ISC
