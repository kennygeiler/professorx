-- Remove the auth.users FK since we use NextAuth, not Supabase Auth
ALTER TABLE public.users DROP CONSTRAINT users_pkey CASCADE;
ALTER TABLE public.users ADD PRIMARY KEY (id);

-- Re-add the FK from tweets to users (was dropped by CASCADE)
ALTER TABLE public.tweets ADD CONSTRAINT tweets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Re-add the FK from categories to users (was dropped by CASCADE)
ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
