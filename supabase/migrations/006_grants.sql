-- Grant table privileges to service_role.
--
-- Hosted Supabase projects apply these grants automatically via default
-- privileges, so the app works there. A local stack (`supabase start`) does
-- not, and every query through the admin client fails with
-- "permission denied for table tweets". The app talks to Postgres only as
-- service_role (see lib/supabase/admin.ts), so that is the only role that
-- needs DML here. RLS still applies to anon/authenticated.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tweets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tweet_categories TO service_role;
