-- Actually remove the auth.users foreign key.
--
-- 005 intended to do this but dropped the users_pkey constraint instead. The
-- FK created in 001 is named users_id_fkey and survived, so every insert into
-- public.users failed with:
--   insert or update on table "users" violates foreign key constraint "users_id_fkey"
-- Local single-user mode has no Supabase Auth user, so the FK cannot be met.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
