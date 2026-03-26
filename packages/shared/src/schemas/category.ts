import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  tweet_count: z.number().int().min(0).default(0),
  sort_order: z.number().int().min(0),
  created_at: z.string().datetime(),
});

export const TweetCategorySchema = z.object({
  tweet_id: z.string().uuid(),
  category_id: z.string().uuid(),
  confidence: z.number().min(0).max(1),
  assigned_by: z.enum(['ai', 'user']),
  assigned_at: z.string().datetime(),
});

export type CategorySchemaType = z.infer<typeof CategorySchema>;
export type TweetCategorySchemaType = z.infer<typeof TweetCategorySchema>;
