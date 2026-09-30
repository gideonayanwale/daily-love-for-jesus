# Daily Love For Jesus — Web Application 🌐

> **High-performance, modern React 19 + Vite 7 Single Page Application (SPA) designed with Tailwind CSS, Lucide icons, and tRPC client connectivity to the NestJS modular backend.**

---

## 🎨 Features & Capabilities

- **Interactive Bible Reader**: Read scriptures across chapters, search verses, compare translations, and copy/bookmark verses.
- **Daily Devotionals**: Today's devotional reading, reflections, prayers, and searchable devotional archive.
- **Hymns Library**: Searchable Christian hymns with full lyrics, chorus highlights, and category filters.
- **Community Wall**: Prayer requests, testimonies, devotional discussion threads, and encouraging interactions.
- **Light & Dark Theme**: Elegant theme switching with persistent user preferences.
- **Integrated Backend Proxy**: Proxies `/api` requests to the NestJS backend at `http://localhost:4000` during local development.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v24.21.0` (or `>=20.18.0 <=24.x.x`)
- npm `>=10.0.0`

### Installation
From the root workspace or inside `app/`:
```bash
npm install --legacy-peer-deps
```

### Local Development Server
```bash
npm run dev
```
Starts the Vite development server on [http://localhost:3000](http://localhost:3000).

### Production Build
```bash
npm run build
```
Generates production-optimized static assets in `dist/public/`.

---

## 📁 Workspace Layout

```
app/
├── src/
│   ├── pages/         # Route views (Home, Bible, Devotionals, Hymns, Community, Settings, Login)
│   ├── components/    # AppLayout, UI widgets, Navigation, Modals
│   ├── lib/           # Supabase client, utilities, storage helpers
│   ├── providers/     # tRPC & React Query client providers
│   └── main.tsx       # Application root entry
├── contracts/         # Shared constants and data interfaces
├── db/                # Static data JSON files (Bible, Hymns)
├── netlify.toml       # Netlify SPA configuration (Node 24)
├── vercel.json        # Vercel SPA rewrites configuration
├── wrangler.toml      # Cloudflare Pages / Workers configuration
└── vite.config.ts     # Vite build settings & API proxying
```

---

## 🔐 Environment Variables

The web app reads client-safe environment variables from `app/.env`:
- `VITE_API_URL`: Base URL of deployed NestJS backend (optional, uses `/api` proxy in dev).
- `VITE_SUPABASE_URL`: Public Supabase endpoint.
- `VITE_SUPABASE_ANON_KEY`: Public Supabase anonymous client key.

*Refer to the root [`ENV_SETUP.md`](../ENV_SETUP.md) for full instructions.*
