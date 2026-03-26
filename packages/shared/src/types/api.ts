import type { TweetWithCategories } from './tweet';
import type { Category } from './category';

// Ingest API
export type IngestTweetPayload = {
  twitter_tweet_id: string;
  author_handle: string;
  author_display_name: string;
  text: string;
  tweet_created_at: string;
  media?: Array<{
    type: 'image' | 'video' | 'gif';
    url: string;
    alt_text?: string;
  }>;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
  };
  quoted_tweet?: {
    twitter_tweet_id: string;
    author_handle: string;
    author_display_name: string;
    text: string;
  };
  source_type: 'like' | 'bookmark';
  raw_data?: Record<string, unknown>;
};

export type IngestRequest = {
  tweets: IngestTweetPayload[];
};

export type IngestResponse = {
  ingested: number;
  duplicates: number;
  errors: number;
};

// Tweet list API
export type TweetListRequest = {
  category_id?: string;
  time_range?: '7d' | '30d' | '90d' | '1y' | 'all';
  page?: number;
  page_size?: number;
};

export type TweetListResponse = {
  tweets: TweetWithCategories[];
  total: number;
  page: number;
  page_size: number;
};

// Search API
export type SearchRequest = {
  q: string;
  category_id?: string;
  time_range?: '7d' | '30d' | '90d' | '1y' | 'all';
  page?: number;
  page_size?: number;
};

export type SearchResponse = {
  tweets: TweetWithCategories[];
  total: number;
};

// Category API
export type CreateCategoryRequest = {
  name: string;
};

export type UpdateCategoryRequest = {
  name?: string;
  sort_order?: number;
};

export type CategoryResponse = Category;

// Correction API
export type CorrectionRequest = {
  tweet_id: string;
  old_category_id: string;
  new_category_id: string;
  reason?: string;
};

export type CorrectionResponse = {
  success: boolean;
};

// Generic API response wrapper
export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiError = {
  data: null;
  error: {
    message: string;
    code?: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
