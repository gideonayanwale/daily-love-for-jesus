# Daily Love For Jesus — NestJS Backend API ⚙️

> **Enterprise-grade, modular NestJS backend powered by Node.js 24, Drizzle ORM, dual PostgreSQL (Neon & Supabase), Swagger OpenAPI, and tRPC.**

---

## 🏛️ Architecture & Modules

The backend is built with modular NestJS architecture located under `src/modules/`:

| Module | Route / Endpoint | Description |
| :--- | :--- | :--- |
| **AuthModule** | `/api/auth` | User profile management, Supabase Auth guard, admin elevation. |
| **BibleModule** | `/api/bible` | Scripture verse lookups, chapter streams, 50+ translations (Bolls Life API + offline KJV). |
| **DevotionalsModule** | `/api/devotionals` | Daily devotionals, daily reflections, audio devotionals, and archives. |
| **HymnsModule** | `/api/hymns` | Christian hymns, lyrics search, categories, and sheet music. |
| **CommunityModule** | `/api/community` | Prayer requests, testimonies, devotional comments, and likes. |
| **TelegramModule** | `/api/telegram` | Automated devotional scraping and ingestion from Telegram ministry channels. |
| **FavoritesModule** | `/api/favorites` | Bookmarking verses, devotionals, and hymns. |
| **SyncModule** | `/api/sync` | Dual-database synchronization between Neon and Supabase, plus `/api/sync/health`. |
| **TrpcModule** | `/api/trpc` | Type-safe tRPC procedure handlers consumed by the React web app. |

---

## 🚀 Running Locally

### Development Mode
```bash
# In backend directory
npm run start:dev

# Or from project root
npm run dev:backend
```
The server will start on port `4000` (or `process.env.PORT`).

### Production Build & Run
```bash
npm run build
npm run start:prod
```

### Docker
```bash
docker build -t daily-love-backend -f Dockerfile ..
docker run -p 4000:4000 --env-file .env daily-love-backend
```

---

## 📖 Swagger Documentation

Interactive OpenAPI documentation is generated automatically:
- URL: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- Schema JSON: `http://localhost:4000/api/docs-json`

---

## 🔐 Environment Variables

The backend loads configuration from `backend/.env` (with fallback to root `.env`).
See [`.env.example`](.env.example) and the root [`ENV_SETUP.md`](../ENV_SETUP.md) for full details.
