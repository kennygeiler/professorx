-- Performance indexes

-- Full-text search on tweets
CREATE INDEX idx_tweets_search_vector ON public.tweets USING GIN (search_vector);

-- User's tweets sorted by date (main query pattern)
CREATE INDEX idx_tweets_user_date ON public.tweets (user_id, tweet_created_at DESC);

-- Category lookups
CREATE INDEX idx_tweet_categories_category ON public.tweet_categories (category_id);

-- User's categories sorted
CREATE INDEX idx_categories_user_sort ON public.categories (user_id, sort_order);

-- Source type filtering (likes vs bookmarks)
CREATE INDEX idx_tweets_user_source ON public.tweets (user_id, source_type);
