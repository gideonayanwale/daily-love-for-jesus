# 🔐 Environment Variables & Secrets Reference Guide

Please refer to the main documentation guide at [`docs/ENVIRONMENT_VARIABLES.md`](../../docs/ENVIRONMENT_VARIABLES.md).

For quick reference:

| Variable Name | Required? | Exposure | Where to find it |
| :--- | :---: | :---: | :--- |
| `SUPABASE_URL` | **Yes** | Public/Server | Supabase Dashboard &rarr; Settings &rarr; API |
| `VITE_SUPABASE_URL` | **Yes** | Client (Vite) | Supabase Dashboard &rarr; Settings &rarr; API |
| `SUPABASE_ANON_KEY` | **Yes** | Public/Server | Supabase Dashboard &rarr; Settings &rarr; API |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Client (Vite) | Supabase Dashboard &rarr; Settings &rarr; API |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **SECRET** (Server) | Supabase Dashboard &rarr; Settings &rarr; API (Service Role) |
| `DATABASE_URL` | **Yes** | **SECRET** (Server) | Supabase Dashboard &rarr; Settings &rarr; Database (Pooler Port 6543) |
| `NEON_DATABASE_URL` | **Yes** | **SECRET** (Server) | Neon Console &rarr; Dashboard &rarr; Connection Details |
| `APP_SECRET` | Optional | **SECRET** (Server) | Random 32-char hex string for sync admin auth |
| `ADMIN_USER_ID` | Optional | Server | Supabase Auth &rarr; Users &rarr; UUID |
| `ADMIN_EMAIL` | Optional | Server | Your Admin Email |
| `TELEGRAM_BOT_TOKEN` | Optional | **SECRET** (Server) | Telegram @BotFather |
| `TELEGRAM_CHANNEL_ID` | Optional | Server | Telegram Channel ID |
| `API_BIBLE_KEY` | Optional | **SECRET** (Server) | scripture.api.bible |
