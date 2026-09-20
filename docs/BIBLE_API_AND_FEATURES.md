# Daily Love For Jesus: Multi-Version & Multilingual Bible Guide

## 📖 1. Bible API Architecture & Integration

We integrated the **Bolls Life API Engine** as our primary provider along with an **IndexedDB & Local Storage Cache** for zero-cost, high-performance scripture delivery.

### Why Bolls Life API?
- **Zero Cost ($0.00)**: No paid tiers, no restrictive rate-limiting.
- **No API Key Required**: Works instantly out of the box.
- **Multilingual (50+ Languages)**: English, Spanish, French, Portuguese, German, Swahili, Russian, Chinese, Hindi, Arabic, and more.
- **Dozens of Popular Translations**:
  - **English**: KJV, NKJV, NIV, ESV, NLT, WEB, AMP, ASV, BBE, YLT
  - **Spanish**: Reina-Valera 1960 (RV1960), NVI, LBLA
  - **French**: Louis Segond 1910 (FRLSG), Bible du Semeur (BDS)
  - **Portuguese**: Almeida Revista e Corrigida (ARC09), NVIPT
  - **Swahili**: Swahili Union Version (SUV)
  - **German**: Luther Bibel (LUT)
  - **Chinese**: Chinese Union Version (CUV)

---

## 💾 2. Offline Download & Storage Engine

### On Web:
- Powered by `app/src/lib/bibleOffline.ts` using the browser's native **IndexedDB** (`DailyLoveBibleDB`).
- When a user reads or taps **"Download for Offline Reading"**, chapters are saved directly into the browser's database.
- If the device loses internet connection, the reader automatically falls back to IndexedDB without throwing network errors.

### On Mobile (Expo):
- Powered by `mobile/src/lib/bibleApi.ts` and `mobile/src/screens/BibleScreen.tsx`.
- Connects directly to scripture endpoints with cached book catalogs and native sharing.

---

## 🎧 3. Audio Narration (Text-to-Speech)
- Powered by `app/src/lib/bibleAudio.ts` using the **Web Speech API**.
- Supports 0.75x, 1x, 1.25x, and 1.5x speed controls.
- Synchronizes with scripture reading by highlighting each verse in real-time as it is spoken.
- Detects the language of the active translation to narrate with native accents.

---

## 🔀 4. Verse Comparison Mode
- Tap any verse in the reader and select **Compare**.
- Opens a side-by-side comparison modal displaying that exact verse across KJV, WEB, ESV, and NIV simultaneously with 1-tap clipboard copying.

---

## 🔐 5. Environment Secrets & Setup

### Web App (`app/.env`)
See `app/.env.example` for all options:
- `DATABASE_URL`: Connection string for PostgreSQL (Neon/Supabase) or MySQL.
- `APP_ID` & `APP_SECRET`: JWT and application security tokens.
- `API_BIBLE_KEY` (Optional): American Bible Society key if utilizing API.Bible as a secondary provider.
- `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHANNEL_ID` (Optional): Telegram bot credentials for automated devotional syncing.

### Mobile App (`mobile/.env`)
See `mobile/.env.example`:
- `EXPO_PUBLIC_API_URL`: Backend server URL.
- `EXPO_PUBLIC_DEFAULT_BIBLE_TRANSLATION`: Default version (e.g. `KJV` or `WEB`).
