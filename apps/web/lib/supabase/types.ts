export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          twitter_handle: string | null;
          twitter_id: string | null;
          display_name: string | null;
          avatar_url: string | null;
          ai_memory: AiMemory;
          settings: UserSettings;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          twitter_handle?: string | null;
          twitter_id?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          ai_memory?: AiMemory;
          settings?: UserSettings;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          sort_order: number;
          tweet_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          sort_order?: number;
          tweet_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      tweets: {
        Row: {
          id: string;
          user_id: string;
          twitter_tweet_id: string;
          author_handle: string | null;
          author_display_name: string | null;
          author_avatar_url: string | null;
          text_content: string;
          media: TweetMedia[];
          metrics: TweetMetrics;
          tweet_type: string;
          source_type: string;
          tweet_created_at: string | null;
          raw_data: Record<string, unknown> | null;
          search_vector: string | null;
          ai_confidence: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          twitter_tweet_id: string;
          author_handle?: string | null;
          author_display_name?: string | null;
          author_avatar_url?: string | null;
          text_content: string;
          media?: TweetMedia[];
          metrics?: TweetMetrics;
          tweet_type?: string;
          source_type?: string;
          tweet_created_at?: string | null;
          raw_data?: Record<string, unknown> | null;
          ai_confidence?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["tweets"]["Insert"]>;
      };
      tweet_categories: {
        Row: {
          id: string;
          tweet_id: string;
          category_id: string;
          assigned_by: string;
          confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tweet_id: string;
          category_id: string;
          assigned_by?: string;
          confidence?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["tweet_categories"]["Insert"]
        >;
      };
    };
  };
}

export interface TweetMedia {
  type: "photo" | "video" | "animated_gif";
  url: string;
  preview_url?: string;
  video_url?: string;
  width?: number;
  height?: number;
}

export interface TweetMetrics {
  likes?: number;
  retweets?: number;
  replies?: number;
  quotes?: number;
  views?: number;
}

export interface AiMemory {
  corrections: AiCorrection[];
  category_rules: AiCategoryRule[];
  version: number;
}

export interface AiCorrection {
  id: string;
  tweet_text: string;
  tweet_id: string;
  original_category: string;
  corrected_category: string;
  user_reason?: string;
  corrected_at: string;
}

export interface AiCategoryRule {
  rule: string;
  created_at: string;
  source: "user_explanation" | "system_inferred";
}

export interface UserSettings {
  sync_likes: boolean;
  sync_bookmarks: boolean;
  skip_explanations: boolean;
}
