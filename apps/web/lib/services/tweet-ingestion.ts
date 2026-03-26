import { createAdminClient } from '@/lib/supabase/admin';
import type { IngestTweet } from '@shared/schemas/ingest';

export interface IngestResult {
  inserted: number;
  updated: number;
  errors: string[];
}

export async function ingestTweets(
  userId: string,
  tweets: IngestTweet[]
): Promise<IngestResult> {
  const supabase = createAdminClient();
  const result: IngestResult = { inserted: 0, updated: 0, errors: [] };

  for (const tweet of tweets) {
    try {
      // Check if tweet already exists for this user
      const { data: existing, error: selectError } = await supabase
        .from('tweets')
        .select('id, updated_at')
        .eq('user_id', userId)
        .eq('twitter_tweet_id', tweet.twitter_tweet_id)
        .maybeSingle();

      if (selectError) {
        result.errors.push(
          `Tweet ${tweet.twitter_tweet_id}: ${selectError.message}`
        );
        continue;
      }

      const payload = {
        user_id: userId,
        twitter_tweet_id: tweet.twitter_tweet_id,
        author_handle: tweet.author_handle,
        author_display_name: tweet.author_display_name,
        author_avatar_url: tweet.author_avatar_url ?? null,
        text_content: tweet.text_content,
        media: tweet.media ?? [],
        metrics: tweet.metrics ?? {},
        tweet_type: tweet.tweet_type ?? 'tweet',
        source_type: tweet.source_type,
        tweet_created_at: tweet.tweet_created_at ?? null,
        raw_data: (tweet.links?.length || tweet.quoted_tweet)
          ? {
              ...(tweet.links?.length ? { links: tweet.links } : {}),
              ...(tweet.quoted_tweet ? { quoted_tweet: tweet.quoted_tweet } : {}),
            }
          : null,
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('tweets')
          .update(payload)
          .eq('id', existing.id);

        if (updateError) {
          result.errors.push(
            `Tweet ${tweet.twitter_tweet_id}: ${updateError.message}`
          );
        } else {
          result.updated += 1;
        }
      } else {
        const { error: insertError } = await supabase
          .from('tweets')
          .insert(payload);

        if (insertError) {
          result.errors.push(
            `Tweet ${tweet.twitter_tweet_id}: ${insertError.message}`
          );
        } else {
          result.inserted += 1;
        }
      }
    } catch (err) {
      result.errors.push(
        `Tweet ${tweet.twitter_tweet_id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}
