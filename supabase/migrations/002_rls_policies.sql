-- Row Level Security policies
-- All tables scoped to user_id = auth.uid()

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweet_categories ENABLE ROW LEVEL SECURITY;

-- Users: own row only
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Categories: own categories only
CREATE POLICY "Users can view own categories"
  ON public.categories FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own categories"
  ON public.categories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (user_id = auth.uid());

-- Tweets: own tweets only
CREATE POLICY "Users can view own tweets"
  ON public.tweets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tweets"
  ON public.tweets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tweets"
  ON public.tweets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tweets"
  ON public.tweets FOR DELETE
  USING (user_id = auth.uid());

-- Tweet Categories: via tweet ownership
CREATE POLICY "Users can view own tweet categories"
  ON public.tweet_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tweets
      WHERE tweets.id = tweet_categories.tweet_id
      AND tweets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tweet categories"
  ON public.tweet_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tweets
      WHERE tweets.id = tweet_categories.tweet_id
      AND tweets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tweet categories"
  ON public.tweet_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tweets
      WHERE tweets.id = tweet_categories.tweet_id
      AND tweets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tweet categories"
  ON public.tweet_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tweets
      WHERE tweets.id = tweet_categories.tweet_id
      AND tweets.user_id = auth.uid()
    )
  );
