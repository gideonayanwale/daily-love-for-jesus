-- Migration 0002: Make Telegram message ingestion idempotent under concurrent webhook retries.
-- Run against both the primary Neon database and any mirrored Supabase database.
-- Keep the oldest Telegram row as canonical and re-point devotional references before
-- deleting duplicate Telegram rows. Existing devotional drafts are retained for review.

BEGIN;

WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (PARTITION BY message_id, chat_id ORDER BY id) AS canonical_id,
    ROW_NUMBER() OVER (PARTITION BY message_id, chat_id ORDER BY id) AS row_num
  FROM public.telegram_messages
),
aggregated AS (
  SELECT
    ranked.canonical_id,
    MIN(messages.devotional_id) FILTER (WHERE messages.devotional_id IS NOT NULL) AS devotional_id,
    BOOL_OR(messages.processed) AS processed
  FROM ranked
  JOIN public.telegram_messages AS messages ON messages.id = ranked.id
  GROUP BY ranked.canonical_id
)
UPDATE public.telegram_messages AS canonical
SET
  devotional_id = COALESCE(canonical.devotional_id, aggregated.devotional_id),
  processed = canonical.processed OR aggregated.processed
FROM aggregated
WHERE canonical.id = aggregated.canonical_id;

WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (PARTITION BY message_id, chat_id ORDER BY id) AS canonical_id,
    ROW_NUMBER() OVER (PARTITION BY message_id, chat_id ORDER BY id) AS row_num
  FROM public.telegram_messages
)
UPDATE public.devotionals AS devotional
SET telegram_message_id = ranked.canonical_id
FROM ranked
WHERE devotional.telegram_message_id = ranked.id
  AND ranked.row_num > 1;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY message_id, chat_id ORDER BY id) AS row_num
  FROM public.telegram_messages
)
DELETE FROM public.telegram_messages AS duplicate
USING ranked
WHERE duplicate.id = ranked.id
  AND ranked.row_num > 1;

WITH ranked_devotionals AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY telegram_message_id ORDER BY id) AS row_num
  FROM public.devotionals
  WHERE telegram_message_id IS NOT NULL
)
UPDATE public.devotionals AS duplicate
SET telegram_message_id = NULL
FROM ranked_devotionals AS ranked
WHERE duplicate.id = ranked.id
  AND ranked.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_devotional_telegram_message
  ON public.devotionals(telegram_message_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_telegram_message_chat
  ON public.telegram_messages(message_id, chat_id);

COMMIT;
