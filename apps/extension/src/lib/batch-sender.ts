/**
 * Batch sender — accumulates parsed tweets and sends them to the backend in batches.
 */

import type { ParsedTweet } from './tweet-parser';
import { getToken, getBackendUrl } from './auth';

const MAX_BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 10_000;
const MAX_RETRIES = 3;

interface BatchStatus {
  pending: number;
  synced: number;
  errors: number;
  lastSync: number | null;
}

let pendingTweets: Array<ParsedTweet & { source_type: 'like' | 'bookmark' }> = [];
let syncedCount = 0;
let errorCount = 0;
let lastSyncTimestamp: number | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Add tweets to the pending batch. Triggers a flush if batch size threshold is reached.
 */
export function addTweets(
  tweets: ParsedTweet[],
  sourceType: 'like' | 'bookmark'
): void {
  const withSource = tweets.map((t) => ({ ...t, source_type: sourceType }));
  pendingTweets.push(...withSource);

  console.log(
    `[ProfessorX] Added ${tweets.length} tweets to batch (pending: ${pendingTweets.length})`
  );

  if (pendingTweets.length >= MAX_BATCH_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

/**
 * Schedule a flush after FLUSH_INTERVAL_MS if one isn't already scheduled.
 */
function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Flush the current batch to the backend.
 */
export async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (pendingTweets.length === 0) return;

  // Take up to MAX_BATCH_SIZE tweets
  const batch = pendingTweets.splice(0, MAX_BATCH_SIZE);

  const token = await getToken();
  if (!token) {
    console.warn('[ProfessorX] No auth token set, skipping flush');
    // Put tweets back
    pendingTweets.unshift(...batch);
    return;
  }

  const backendUrl = await getBackendUrl();
  const url = `${backendUrl}/api/tweets/ingest`;

  const payload = {
    tweets: batch.map((t) => ({
      twitter_tweet_id: t.twitter_tweet_id,
      author_handle: t.author_handle,
      author_display_name: t.author_display_name,
      author_avatar_url: t.author_avatar_url,
      text_content: t.text_content,
      media: t.media,
      metrics: t.metrics,
      tweet_type: t.tweet_type,
      source_type: t.source_type,
      tweet_created_at: t.tweet_created_at,
    })),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      syncedCount += result.data?.ingested ?? batch.length;
      lastSyncTimestamp = Date.now();

      console.log(
        `[ProfessorX] Flushed ${batch.length} tweets to backend (synced total: ${syncedCount})`
      );

      // If there are still pending tweets, schedule another flush
      if (pendingTweets.length > 0) {
        scheduleFlush();
      }

      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[ProfessorX] Flush attempt ${attempt + 1}/${MAX_RETRIES} failed:`,
        lastError.message
      );

      if (attempt < MAX_RETRIES - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  errorCount += batch.length;
  console.error(
    `[ProfessorX] Failed to flush ${batch.length} tweets after ${MAX_RETRIES} retries:`,
    lastError?.message
  );
}

/**
 * Get the current batch status.
 */
export function getStatus(): BatchStatus {
  return {
    pending: pendingTweets.length,
    synced: syncedCount,
    errors: errorCount,
    lastSync: lastSyncTimestamp,
  };
}
