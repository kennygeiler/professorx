import { z } from 'zod';
import { TweetMediaSchema, TweetMetricsSchema } from './tweet';

// Ingest request schema
export const IngestTweetPayloadSchema = z.object({
  twitter_tweet_id: z.string().min(1),
  author_handle: z.string().min(1),
  author_display_name: z.string().min(1),
  text: z.string(),
  tweet_created_at: z.string().datetime(),
  media: z.array(TweetMediaSchema).optional(),
  metrics: TweetMetricsSchema.optional(),
  quoted_tweet: z
    .object({
      twitter_tweet_id: z.string().min(1),
      author_handle: z.string().min(1),
      author_display_name: z.string().min(1),
      text: z.string(),
    })
    .optional(),
  source_type: z.enum(['like', 'bookmark']),
  raw_data: z.record(z.unknown()).optional(),
});

export const IngestRequestSchema = z.object({
  tweets: z.array(IngestTweetPayloadSchema).min(1).max(50),
});

export const IngestResponseSchema = z.object({
  ingested: z.number().int().min(0),
  duplicates: z.number().int().min(0),
  errors: z.number().int().min(0),
});

// Tweet list request schema
export const TimeRangeSchema = z.enum(['7d', '30d', '90d', '1y', 'all']);

export const TweetListRequestSchema = z.object({
  category_id: z.string().uuid().optional(),
  time_range: TimeRangeSchema.optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(20),
});

// Search request schema
export const SearchRequestSchema = z.object({
  q: z.string().min(3),
  category_id: z.string().uuid().optional(),
  time_range: TimeRangeSchema.optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(20),
});

// Category request schemas
export const CreateCategoryRequestSchema = z.object({
  name: z.string().min(1).max(100),
});

export const UpdateCategoryRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
});

// Correction request schema
export const CorrectionRequestSchema = z.object({
  tweet_id: z.string().uuid(),
  old_category_id: z.string().uuid(),
  new_category_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export type IngestRequestSchemaType = z.infer<typeof IngestRequestSchema>;
export type IngestResponseSchemaType = z.infer<typeof IngestResponseSchema>;
export type TweetListRequestSchemaType = z.infer<typeof TweetListRequestSchema>;
export type SearchRequestSchemaType = z.infer<typeof SearchRequestSchema>;
export type CreateCategoryRequestSchemaType = z.infer<typeof CreateCategoryRequestSchema>;
export type UpdateCategoryRequestSchemaType = z.infer<typeof UpdateCategoryRequestSchema>;
export type CorrectionRequestSchemaType = z.infer<typeof CorrectionRequestSchema>;
