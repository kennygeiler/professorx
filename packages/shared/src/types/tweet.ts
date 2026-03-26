export type TweetMedia = {
  type: 'image' | 'video' | 'gif';
  url: string;
  alt_text?: string;
};

export type TweetMetrics = {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
};

export type QuotedTweet = {
  twitter_tweet_id: string;
  author_handle: string;
  author_display_name: string;
  text: string;
  media?: TweetMedia[];
};

export type SourceType = 'like' | 'bookmark';

export type Tweet = {
  id: string;
  user_id: string;
  twitter_tweet_id: string;
  author_handle: string;
  author_display_name: string;
  text: string;
  tweet_created_at: string;
  media?: TweetMedia[];
  metrics?: TweetMetrics;
  quoted_tweet?: QuotedTweet;
  source_type: SourceType;
  raw_data?: Record<string, unknown>;
  ingested_at: string;
  categorized_at?: string;
};

export type TweetWithCategories = Tweet & {
  categories: Array<{
    id: string;
    name: string;
    confidence: number;
    assigned_by: 'ai' | 'user';
  }>;
};
