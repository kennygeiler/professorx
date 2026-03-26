-- ProfessorX: Initial Schema
-- Users, Categories, Tweets, Tweet-Category junction

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  twitter_handle TEXT,
  twitter_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  ai_memory JSONB DEFAULT '{"corrections": [], "category_rules": [], "version": 1}'::jsonb,
  settings JSONB DEFAULT '{"sync_likes": true, "sync_bookmarks": true, "skip_explanations": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  sort_order INT DEFAULT 0,
  tweet_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE public.tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  twitter_tweet_id TEXT NOT NULL,
  author_handle TEXT,
  author_display_name TEXT,
  author_avatar_url TEXT,
  text_content TEXT NOT NULL,
  media JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  tweet_type TEXT DEFAULT 'tweet',
  source_type TEXT DEFAULT 'like',
  tweet_created_at TIMESTAMPTZ,
  raw_data JSONB,
  search_vector TSVECTOR,
  ai_confidence REAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, twitter_tweet_id)
);

CREATE TABLE public.tweet_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES public.tweets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  assigned_by TEXT DEFAULT 'ai',
  confidence REAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tweet_id, category_id)
);
