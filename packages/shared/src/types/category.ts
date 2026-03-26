export type Category = {
  id: string;
  user_id: string;
  name: string;
  tweet_count: number;
  sort_order: number;
  created_at: string;
};

export type TweetCategory = {
  tweet_id: string;
  category_id: string;
  confidence: number;
  assigned_by: 'ai' | 'user';
  assigned_at: string;
};

export type CategoryWithStats = Category & {
  recent_tweet_ids: string[];
};
