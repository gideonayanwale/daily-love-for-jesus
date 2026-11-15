-- Migration 0001: Add structured devotional fields
-- Run against: Supabase PostgreSQL / Neon
-- NOTE: `topic` already exists in the base supabase-schema.sql for fresh installs.
-- It is re-declared here with IF NOT EXISTS so existing databases that predate
-- that schema file also receive the column; the guard makes this a no-op there.
ALTER TABLE devotionals ADD COLUMN IF NOT EXISTS topic VARCHAR(500);
ALTER TABLE devotionals ADD COLUMN IF NOT EXISTS declaration_of_faith TEXT;
ALTER TABLE devotionals ADD COLUMN IF NOT EXISTS daily_capsule TEXT;
ALTER TABLE devotionals ADD COLUMN IF NOT EXISTS brothers_keeper TEXT;
ALTER TABLE devotionals ADD COLUMN IF NOT EXISTS daily_bible_reading TEXT;
ALTER TABLE devotionals ADD COLUMN IF NOT EXISTS other_info TEXT;

CREATE INDEX IF NOT EXISTS idx_devotionals_pub_date
  ON public.devotionals(is_published, devotional_date DESC);
