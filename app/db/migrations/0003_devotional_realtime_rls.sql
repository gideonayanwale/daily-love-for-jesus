-- Migration 0003: authorize devotional Realtime refresh channels with RLS.
-- Apply only after the Daily Love For Jesus schema (including public.users) exists
-- in the Supabase project used by the web client.
--
-- The public topic contains invalidation metadata only (ID + action), never draft
-- devotional content. Public readers may subscribe to it. Draft/admin invalidations
-- use a separate topic and require a server-assigned platform role in public.users.
--
-- Also disable "Allow public access to channels" in Supabase Dashboard >
-- Realtime > Settings so clients cannot bypass these policies with public channels.

BEGIN;

DROP POLICY IF EXISTS "dlfj_public_devotional_refresh_read" ON realtime.messages;
CREATE POLICY "dlfj_public_devotional_refresh_read"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (
  extension = 'broadcast'
  AND realtime.topic() = 'devotionals'
);

DROP POLICY IF EXISTS "dlfj_admin_devotional_refresh_read" ON realtime.messages;
CREATE POLICY "dlfj_admin_devotional_refresh_read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'broadcast'
  AND realtime.topic() = 'admin:devotionals'
  AND EXISTS (
    SELECT 1
    FROM public.users AS app_user
    WHERE app_user.id = (SELECT auth.uid())
      AND app_user.role IN ('admin', 'elevated_admin', 'superadmin')
  )
);

-- Clients are subscribers only. Do not create INSERT policies for these topics;
-- all broadcasts are sent by the trusted server using its service-role credential.

COMMIT;
