# Telegram devotional pipeline

Telegram is an ingestion and distribution channel for the Devotionals feature. It is not a separate public page.

## How it works

1. The Telegram bot receives a channel post from the configured channel.
2. The webhook validates Telegram's secret token, validates the message shape, and checks the configured channel ID or channel username.
3. The message is stored in `telegram_messages` and parsed into an **unpublished devotional draft**.
4. The devotional admin opens **Admin → Devotionals → Import from Telegram** to inspect unprocessed messages. Imported drafts are also visible under **Manage Devotions**.
5. An authorized admin edits the draft and publishes it. Only published devotionals appear on the public Devotionals page.
6. The admin can use **Send to Telegram** on a published devotional to send it back to the channel. Long messages are split into safe-sized plain-text messages; Telegram delivery errors are surfaced instead of reported as success.
7. A small Realtime broadcast tells connected clients to refresh. Public clients refetch published content; admin clients refetch the protected draft list. Draft content is never included in the broadcast.

## Database migration

Before deploying this ingestion version, apply `app/db/migrations/0002_unique_telegram_message_identity.sql` to the primary Neon database and any mirrored Supabase PostgreSQL database. It deduplicates repeated Telegram update rows, preserves extra devotional drafts as unlinked drafts, and adds unique indexes so concurrent Telegram retries cannot create duplicate message rows or duplicate devotional drafts.

## Required environment variables

- `TELEGRAM_BOT_TOKEN`: bot token; server-side only, never expose it to the browser.
- `TELEGRAM_CHANNEL_ID`: numeric channel ID (recommended) or the channel username including `@`.
- `TELEGRAM_WEBHOOK_SECRET`: a 1–256 character secret accepted by Telegram for the webhook header.
- `APP_SECRET`: used to create keyed anonymous visitor identifiers.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: required for the server-side Realtime broadcast. Keep the service-role key server-only.

The bot must be added to the target Telegram channel with permission to read channel posts and publish messages.

## Webhook setup (recommended for Vercel/Netlify)

Deploy the API first, then register the webhook with Telegram. Replace placeholders locally; do not commit the token or secret:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_PUBLIC_API_DOMAIN/api/telegram/webhook",
    "secret_token": "YOUR_TELEGRAM_WEBHOOK_SECRET",
    "allowed_updates": ["channel_post", "message"]
  }'
```

Telegram sends the secret in `X-Telegram-Bot-Api-Secret-Token`. The webhook rejects requests with a missing or incorrect secret in production, and rejects posts that do not originate from the configured channel.

For persistent non-serverless deployments, the app has a five-minute `getUpdates` polling fallback when a bot token and channel ID are configured and no webhook secret is set. Do not run polling and webhook delivery at the same time: Telegram does not permit `getUpdates` while a webhook is active. Serverless deployments should use the webhook.

## Operational checks

- Confirm Telegram's `setWebhook` response has `ok: true`.
- Confirm `getWebhookInfo` reports the intended public API URL and no persistent delivery error.
- Post a test devotional in the configured channel and confirm it appears as a draft, not on the public feed.
- Publish the draft from the admin dashboard and confirm it appears on the public Devotionals page.
- Use **Send to Telegram** and confirm the channel receives it.
- If Realtime is unavailable, the database remains the source of truth; refresh the page to load the latest published/devotional-admin data.
