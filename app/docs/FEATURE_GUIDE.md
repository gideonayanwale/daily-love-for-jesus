# Daily Love For Jesus — Feature Guide

This guide is written for the app operator — the person responsible for running and maintaining the Daily Love For Jesus platform. No deep technical knowledge is assumed. Where technical steps are unavoidable, they are explained plainly.

---

**Telegram devotional workflow:** Telegram is an import source inside the devotional administration area, not a separate public destination. The bot webhook validates its secret and configured channel, then stores each accepted message and attempts to parse it into an unpublished draft. Admins and elevated admins review the draft in Manage Devotions, edit it if needed, and publish it. Public devotional list/detail procedures only return published records. Telegram delivery is a separate explicit action available only after publication; missing bot configuration or Telegram API errors are surfaced as failures. Realtime events carry only an invalidation signal (record ID and action), never devotional draft content.

**Realtime and authorization:** Mutations are authorized on the server using the persisted users.role; client-side role labels are only presentation. The Realtime topic is used to refresh public and admin queries. Since the broadcast payload contains no devotional text, public subscribers can safely receive refresh signals while the API continues to filter drafts.

## 1. Environment Setup

All configuration lives in a file called `.env` at the root of the `app/` folder. Copy `.env.example` to `.env` and fill in each value. The table below explains every variable.

| Variable | What it does | Where to get it |
|---|---|---|
| `VITE_API_URL` | Backend API address (leave blank in local dev; Vite proxies automatically) | Your deployed backend URL in production |
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_URL` | Same URL exposed to the browser | Same as above |
| `SUPABASE_ANON_KEY` | Public key used by the browser client | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Same key exposed to the browser | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key for elevated server-side operations — **never expose in the browser** | Supabase Dashboard → Project Settings → API |
| `NEON_DATABASE_URL` | Primary PostgreSQL connection string (Neon) | Neon Console → your project → Connection Details |
| `DATABASE_URL` | Fallback PostgreSQL connection (Supabase direct) | Supabase Dashboard → Project Settings → Database |
| `APP_SECRET` | Secret used to sign JWT tokens | Generate a long random string (e.g. `openssl rand -hex 32`) |
| `ADMIN_USER_ID` | Supabase Auth UUID of the first admin account | Supabase Dashboard → Authentication → Users |
| `ADMIN_EMAIL` | Email of the first admin account | Your own admin email address |
| `API_BIBLE_KEY` | Optional key for the API.Bible service | https://scripture.api.bible/signup (free tier available) |
| `TELEGRAM_BOT_TOKEN` | Token for your Telegram bot | Talk to @BotFather on Telegram → `/newbot` |
| `TELEGRAM_CHANNEL_ID` | Numeric ID of your church/devotional Telegram channel | Forward a message from the channel to @userinfobot |
| `TELEGRAM_WEBHOOK_SECRET` | A secret string Telegram will send with every webhook call so you can verify it is genuine | Make up any long random string |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary account name | Cloudinary Dashboard → top-left |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Cloudinary Dashboard → Settings → Access Keys |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret — **keep private** | Cloudinary Dashboard → Settings → Access Keys |

> **Tip:** Telegram-related variables are entirely optional. If `TELEGRAM_BOT_TOKEN` is left blank, the scheduler and webhook will simply not run. The app works fully without Telegram.

---

## 2. Database Setup

The app uses two databases that serve different purposes. Both must be set up before the app will work correctly.

### 2a. Neon (Primary Database)

Neon is a serverless PostgreSQL service. It stores all application data: devotionals, users, Bible content, hymns, groups, audit logs, and media upload records.

1. Create a free project at https://console.neon.tech
2. Copy the connection string from **Connection Details** — it looks like:
   `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. Paste it into `.env` as `NEON_DATABASE_URL`

The app always tries Neon first. If Neon is unavailable, it falls back to `DATABASE_URL` (Supabase direct).

### 2b. Supabase (Auth + Realtime + Storage)

Supabase handles three separate jobs:

- **Authentication** — sign up, sign in, password reset, and session management
- **Realtime** — push notifications to all open admin dashboards when a devotional changes
- **Storage** — a permanent archive copy of every media file uploaded

Steps:
1. Create a free project at https://supabase.com
2. Go to **Project Settings → API** and copy your URL, anon key, and service role key into `.env`
3. Go to **SQL Editor** and run the contents of `db/supabase-schema.sql` to create the `media_uploads` table and its security rules

### 2c. Running Migrations

The Neon database schema is managed with Drizzle ORM. After setting `NEON_DATABASE_URL`, run the SQL migration file to add all required columns:

```
db/migrations/0001_add_devotional_fields.sql
```

This file uses `ADD COLUMN IF NOT EXISTS` throughout, so it is safe to run more than once. It adds the six structured devotional content columns (`declaration_of_faith`, `daily_capsule`, `brothers_keeper`, `daily_bible_reading`, `other_info`, `topic`) plus `media_url` on the devotionals table.

---

## 3. User Roles & Permissions

The app has three levels of access.

| Role | What they can do |
|---|---|
| `user` | Sign in, read published devotionals, search the Bible, browse hymns, manage their own favourites, join communities and groups |
| `elevated_admin` | Everything a `user` can do, plus: create, edit, publish, and delete devotionals manually (the fallback path when Telegram is not running), upload media |
| `admin` | Everything an `elevated_admin` can do, plus: view raw Telegram messages, trigger manual message processing, manage community groups and teachers, promote users to `elevated_admin` |

**Promoting a user to elevated_admin:** An `admin` can call the `auth.promoteToElevatedAdmin` mutation from the API, passing the target user's ID. No UI screen exists for this yet — it must be done via a tool like Postman or a custom script while authenticated as admin.

**How roles are assigned at sign-up:** Every new account starts as `user`. Sign-in never grants or changes roles. The first `admin` must be provisioned by a trusted operator against the verified Supabase UUID in the application users table. After bootstrap, an `admin` can promote users to `elevated_admin` through the protected `auth.promoteToElevatedAdmin` procedure.

---

## 4. User Experience Flow

### 4a. Sign Up

1. The user opens the app and taps **Sign Up**
2. They enter their name, a valid email address, and a password
3. The password strength bar gives real-time feedback — a password is accepted only when it meets minimum strength requirements
4. All inputs are sanitised (HTML tags stripped) and validated before submission
5. On success, Supabase sends a confirmation email; the user is signed in immediately

### 4b. Sign In

1. The user enters their email and password
2. After three failed attempts in a row, a 30-second cooldown is enforced — this limits brute-force attacks
3. Inline error messages appear below each field (never a generic "something went wrong" pop-up)
4. On success, a JWT session is stored locally and the user is taken to the home screen

### 4c. Forgot Password

1. On the Sign In screen, the user taps **Forgot password?**
2. They enter their email address
3. Supabase sends a password-reset link to that address
4. The link opens a reset screen where the user sets a new password

### 4d. Using the App

Once signed in, users can:

- **Daily Devotional** — view today's devotional including all structured sections (title, scripture, body, declaration of faith, daily capsule, brothers keeper, daily Bible reading, other info, prayer). Publishes automatically via Telegram or manually by an elevated admin.
- **Bible** — search and read scripture across 50+ translations (Bolls Life API, free, no key required). An optional API.Bible key unlocks additional translations.
- **Hymns** — browse, search by title or category, and read full hymn lyrics.
- **Favourites** — bookmark any Bible verse or hymn; accessible from a personal favourites list.

---

## 5. Admin Features

### 5a. Accessing the Admin Panel

Navigate to `/admin/devotionals` in the browser. The route is protected by `AdminRoute` — only users with the `elevated_admin` or `admin` role can see it. Anyone else is redirected to the home page.

The panel has three tabs: **New Devotion**, **Manage Devotions**, and **Telegram Messages**.

### 5b. Creating a Devotion Manually (Fallback)

This is the fallback path for days when the Telegram scheduler has not run, or when the minister wants to write a devotional directly.

1. Open the **New Devotion** tab
2. Fill in the required fields: **Title** and **Devotional Body**
3. Optionally fill in Scripture Reference, Scripture Text, Reflection, Prayer, Author, and Devotional Date
4. Upload media if desired (see section 5c)
5. Check **Publish immediately** to make it visible to users right away, or leave it unchecked to save as a draft
6. Click **Create Devotional**

All fields are sanitised on the client and validated again on the server. Character limits are enforced at both layers.

### 5c. Media Uploads (Cloudinary + Supabase Archive)

The upload flow is fully automatic once the credentials in `.env` are set:

1. The admin clicks the upload button and selects an image or video file
2. The browser requests a **signed upload URL** from the server (no raw credentials ever touch the browser)
3. The file is uploaded **directly to Cloudinary** using that signed URL — the server is not in the upload path, keeping it fast
4. Progress is shown as a percentage bar in real time
5. Once Cloudinary confirms the upload, the server **fetches a copy and archives it to Supabase Storage** (`media-uploads` bucket) as a permanent backup
6. The final Cloudinary URL is attached to the devotional record

This dual-storage approach means the app is never dependent on a single CDN. If Cloudinary is ever unavailable, the Supabase copy remains accessible.

### 5d. Managing Devotions (Edit, Publish, Delete)

Open the **Manage Devotions** tab to see all saved devotionals.

- **Publish / Unpublish** — the eye icon toggles a devotional between draft and published. Only published devotionals are visible to regular users.
- **Edit** — click the pencil icon to expand an inline edit form. Change title, body, scripture, reflection, or prayer and click **Save Changes**.
- **Delete** — click the red trash icon. A confirmation dialog appears before anything is deleted. Deletion is permanent.

All changes broadcast in real time to any other admin dashboards that are open (see section 7).

### 5e. Reviewing Telegram Messages

Open the **Telegram Messages** tab to see incoming messages from the Telegram channel that have not yet been converted into devotionals.

For each message, click **Convert to Devotional** to parse the text and create a devotional record automatically. The parser extracts structured sections (see section 9) from the message text.

---

## 6. Telegram Scheduler

### 6a. How It Works

The app's backend includes a built-in scheduler that polls the Telegram Bot API at scheduled times each day. When new messages are found, they are stored in the database and automatically parsed into devotional records.

This runs only when:
- `TELEGRAM_BOT_TOKEN` is set in `.env`
- The backend is running as a long-lived server process (not on a serverless platform like Vercel or Netlify)

### 6b. Schedule (2 AM and 4 AM)

The scheduler fires at **2:00 AM** and **4:00 AM** (server local time). These times match the typical schedule when daily devotionals are posted to the ministry's Telegram channel.

A guard prevents the same hour from being processed twice — even if the server clock drifts slightly, the scheduler will not fire twice within the same hour.

### 6c. Webhook vs Polling

The app supports both methods for receiving Telegram messages:

**Webhook (recommended for production):** Telegram pushes updates to your server immediately when a message is posted. Set up by calling Telegram's `setWebhook` API pointing to `https://yourdomain.com/api/telegram/webhook`. The `TELEGRAM_WEBHOOK_SECRET` value is sent with every call and verified by the server — messages from any other source are rejected with a 401 error.

**Polling (scheduler fallback):** The scheduler polls Telegram at 2 AM and 4 AM. This is the default for self-hosted servers where a public webhook URL may not be available. No extra setup is needed beyond setting `TELEGRAM_BOT_TOKEN`.

Both methods store messages in the same database table and can run simultaneously without creating duplicates (duplicate detection is built in).

### 6d. What Happens If Telegram Is Down

If the Telegram API is unavailable during a scheduled poll, the error is logged and the scheduler moves on silently — it does not crash the server. The devotional for that day will not be created automatically.

In that case, the **elevated_admin** uses the **New Devotion** tab (section 5b) to create the devotional manually. This is the designed fallback path.

---

## 7. Real-Time Dashboard

When an elevated_admin or admin creates, edits, publishes, or deletes a devotional, every other admin browser session that is open updates automatically — no page refresh needed.

**How it works:**

1. After any devotional mutation, the server sends a broadcast message to Supabase Realtime on the `devotionals` channel with the event name `devotional_changed`
2. Every open admin browser subscribes to that channel via a lightweight WebSocket connection
3. When the event arrives, the browser tells tRPC to re-fetch both the devotional list (`devotional.list`) and today's devotional (`devotional.today`) from the server
4. The screen updates with the latest data within seconds

This pattern means the dashboard never shows stale data, and multiple admins can work simultaneously without stepping on each other.

---

## 8. Security Checklist

The following protections are built into the app. Review each one before going to production.

| Protection | Where it is enforced | Notes |
|---|---|---|
| **Webhook secret validation** | `api/boot.ts` | Every incoming Telegram webhook is checked against `TELEGRAM_WEBHOOK_SECRET`. Set this to a long random string and configure it in BotFather's `setWebhook` call. |
| **Role-based access control (RBAC)** | `api/middleware.ts`, `api/lib/rbac.ts` | Every sensitive tRPC procedure checks the caller's role before executing. `elevated_admin` bypass is intentional for devotional mutations. |
| **Input sanitisation** | Frontend (`sanitise()` helper) + Zod schemas on the server | HTML tags are stripped on the client. The server re-validates all inputs with strict Zod schemas including length limits. Neither layer trusts the other. |
| **Rate limiting (login cooldown)** | `src/pages/Login.tsx` | Three consecutive failed login attempts trigger a 30-second wait before another attempt is allowed. |
| **Row-Level Security (RLS)** | Supabase (`db/supabase-schema.sql`) | The `media_uploads` table in Supabase has RLS policies: users can only read their own records; service-role key is required to write. |
| **Signed upload URLs** | `api/mediaRouter.ts` | Cloudinary credentials never reach the browser. The server generates a short-lived signed URL; the client uploads directly using that URL. |
| **Service role key protection** | `.env` only | `SUPABASE_SERVICE_ROLE_KEY` and `CLOUDINARY_API_SECRET` are only used server-side. Never set `VITE_` prefixed versions of these. |
| **Anonymous visit tracking** | `api/boot.ts` | Only unauthenticated GET requests to non-static paths are logged (IP, user-agent, path). No personal data is collected without authentication. |

---

## 9. Devotional Content Sections

Each devotional is composed of up to seven named sections. When a Telegram message is received, the parser automatically identifies each section by looking for specific text markers at the start of a line. When creating manually, each section has its own input field.

| Section | Field name | Telegram marker | Purpose |
|---|---|---|---|
| **Title** | `title` | First line of the message | The devotional heading shown at the top |
| **Topic** | `topic` | `Topic:` | A short theme or keyword for the day |
| **Devotional Body** | `body` | Everything after the title up to the first section marker | The main teaching or message text |
| **Declaration of Faith** | `declarationOfFaith` | `Declaration of Faith:` | A spoken confession for the reader |
| **Daily Capsule** | `dailyCapsule` | `Daily Capsule:` | A brief summary or key thought |
| **Brothers Keeper** | `brothersKeeper` | `Be Your Brother's Keeper:` | A call to community action or intercession |
| **Daily Bible Reading** | `dailyBibleReading` | `Daily Bible Reading:` | Recommended scripture passage(s) for the day |
| **Other Info** | `otherInfo` | `Other Info:` | Announcements, events, or supplementary content |
| **Prayer** | `prayer` | `Prayer:` or `Let Us Pray:` | The closing prayer |

The markers are case-insensitive — `TOPIC:`, `Topic:`, and `topic:` all work. Everything between one marker and the next belongs to that section.

---

## 10. Media Upload Flow

This section traces the complete path of a file from the admin's device to permanent storage.

```
Admin selects file
        │
        ▼
Browser requests signed URL
  POST /api/trpc/media.uploadUrl
  (fileName, mimeType, folder)
        │
        ▼
Server generates Cloudinary signature
  (HMAC-SHA1 of params + API secret)
  Returns: uploadUrl + fields (api_key, timestamp, public_id, signature)
        │
        ▼
Browser uploads file DIRECTLY to Cloudinary
  POST https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload
  Progress tracked via XMLHttpRequest onprogress event
        │
        ▼
Cloudinary returns secure_url
        │
        ▼
Browser requests Supabase archive
  POST /api/trpc/media.archiveToSupabase
  (cloudinaryUrl, fileName)
        │
        ▼
Server fetches file from Cloudinary
  → Uploads to Supabase Storage bucket: media-uploads/
  → Logs record to media_uploads table (userId, cloudinaryUrl, supabaseUrl, fileName, mimeType, size)
        │
        ▼
Browser receives final Cloudinary URL
  → Stored in the devotional record as mediaUrl
```

**Why both Cloudinary and Supabase?**

Cloudinary provides fast global CDN delivery optimised for images and video — transformations, resizing, and format conversion are built in. Supabase Storage serves as a permanent archive that the ministry owns and controls directly. If the Cloudinary account is ever paused or the CDN is unreachable, the Supabase copy ensures no media is lost.

The server is never in the upload path for the Cloudinary step — only for the archive step — which keeps upload speed as fast as the user's connection allows.
