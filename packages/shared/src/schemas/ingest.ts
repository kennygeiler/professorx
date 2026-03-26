import { z } from 'zod';
import { MAX_INGEST_BATCH_SIZE } from '../constants';

export const IngestTweetMediaSchema = z.object({
  type: z.enum(['photo', 'video', 'animated_gif']),
  url: z.string().url(),
  preview_url: z.string().url().optional(),
  video_url: z.string().url().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const IngestTweetMetricsSchema = z.object({
  likes: z.number().int().min(0).optional(),
  retweets: z.number().int().min(0).optional(),
  replies: z.number().int().min(0).optional(),
  quotes: z.number().int().min(0).optional(),
  views: z.number().int().min(0).optional(),
});

export const IngestTweetSchema = z.object({
  twitter_tweet_id: z.string().min(1),
  author_handle: z.string().min(1),
  author_display_name: z.string().min(1),
  author_avatar_url: z.string().url().optional().nullable(),
  text_content: z.string(),
  media: z.array(IngestTweetMediaSchema).optional().default([]),
  metrics: IngestTweetMetricsSchema.optional().default({}),
  tweet_type: z.string().default('tweet'),
  source_type: z.enum(['like', 'bookmark']),
  tweet_created_at: z.string().datetime().optional().nullable(),
  links: z.array(z.object({
    url: z.string(),
    display_url: z.string(),
  })).optional().default([]),
});

export const IngestRequestSchema = z.object({
  tweets: z.array(IngestTweetSchema).min(1).max(MAX_INGEST_BATCH_SIZE),
});

export type IngestTweet = z.infer<typeof IngestTweetSchema>;
export type IngestRequest = z.infer<typeof IngestRequestSchema>;
