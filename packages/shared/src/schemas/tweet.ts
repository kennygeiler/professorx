import { z } from 'zod';

export const TweetMediaSchema = z.object({
  type: z.enum(['image', 'video', 'gif']),
  url: z.string().url(),
  alt_text: z.string().optional(),
});

export const TweetMetricsSchema = z.object({
  likes: z.number().int().min(0),
  retweets: z.number().int().min(0),
  replies: z.number().int().min(0),
  quotes: z.number().int().min(0),
});

export const QuotedTweetSchema = z.object({
  twitter_tweet_id: z.string().min(1),
  author_handle: z.string().min(1),
  author_display_name: z.string().min(1),
  text: z.string(),
  media: z.array(TweetMediaSchema).optional(),
});

export const TweetSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  twitter_tweet_id: z.string().min(1),
  author_handle: z.string().min(1),
  author_display_name: z.string().min(1),
  text: z.string(),
  tweet_created_at: z.string().datetime(),
  media: z.array(TweetMediaSchema).optional(),
  metrics: TweetMetricsSchema.optional(),
  quoted_tweet: QuotedTweetSchema.optional(),
  source_type: z.enum(['like', 'bookmark']),
  raw_data: z.record(z.unknown()).optional(),
  ingested_at: z.string().datetime(),
  categorized_at: z.string().datetime().optional(),
});

export type TweetSchemaType = z.infer<typeof TweetSchema>;
