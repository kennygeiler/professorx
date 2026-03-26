/**
 * Tweet parser — extracts normalized tweet data from Twitter's internal API responses.
 *
 * Twitter's GraphQL API returns deeply nested JSON with a pattern of:
 *   data.*.instructions[].entries[].content.itemContent.tweet_results.result
 *
 * Each tweet result contains:
 *   - legacy: tweet text, media, metrics
 *   - core.user_results.result.legacy: author info
 *   - note_tweet.note_tweet_results.result.text: long-form tweet text
 */

export interface ParsedTweet {
  twitter_tweet_id: string;
  author_handle: string;
  author_display_name: string;
  author_avatar_url: string | null;
  text_content: string;
  media: ParsedMedia[];
  metrics: ParsedMetrics;
  tweet_type: string;
  tweet_created_at: string | null;
}

export interface ParsedMedia {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  preview_url?: string;
  width?: number;
  height?: number;
}

export interface ParsedMetrics {
  likes?: number;
  retweets?: number;
  replies?: number;
  quotes?: number;
  views?: number;
}

/**
 * Parse Twitter's GraphQL API response and extract tweet objects.
 */
export function parseTweetsFromResponse(
  data: unknown,
  url: string
): ParsedTweet[] {
  const tweets: ParsedTweet[] = [];

  try {
    const entries = extractEntries(data);
    for (const entry of entries) {
      const parsed = parseEntry(entry);
      if (parsed) {
        tweets.push(parsed);
      }
    }
  } catch (err) {
    console.warn('[ProfessorX] Failed to parse response from', url, err);
  }

  return tweets;
}

/**
 * Navigate the nested response structure to find timeline entries.
 * Twitter's API nests entries under various paths depending on the endpoint.
 */
function extractEntries(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return [];

  const entries: unknown[] = [];

  // Recursively search for instructions containing entries
  walkObject(data, (key, value) => {
    if (key === 'entries' && Array.isArray(value)) {
      entries.push(...value);
    }
  });

  return entries;
}

/**
 * Walk an object tree, calling the callback for each key/value pair.
 * Limited depth to prevent infinite recursion.
 */
function walkObject(
  obj: unknown,
  callback: (key: string, value: unknown) => void,
  depth = 0
): void {
  if (depth > 10 || !obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      walkObject(item, callback, depth + 1);
    }
    return;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    callback(key, record[key]);
    walkObject(record[key], callback, depth + 1);
  }
}

/**
 * Parse a single timeline entry into a ParsedTweet, or return null if not a tweet.
 */
function parseEntry(entry: unknown): ParsedTweet | null {
  if (!entry || typeof entry !== 'object') return null;

  const record = entry as Record<string, unknown>;

  // Try multiple paths where tweet_results can live
  const tweetResult =
    getNestedValue(record, [
      'content',
      'itemContent',
      'tweet_results',
      'result',
    ]) ??
    getNestedValue(record, [
      'item',
      'itemContent',
      'tweet_results',
      'result',
    ]);

  if (!tweetResult || typeof tweetResult !== 'object') return null;

  return parseTweetResult(tweetResult as Record<string, unknown>);
}

/**
 * Parse a tweet_results.result object into a ParsedTweet.
 */
function parseTweetResult(
  result: Record<string, unknown>
): ParsedTweet | null {
  // Handle "TweetWithVisibilityResults" wrapper
  if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) {
    result = result.tweet as Record<string, unknown>;
  }

  // Must be a Tweet type
  if (
    result.__typename !== 'Tweet' &&
    result.__typename !== undefined
  ) {
    return null;
  }

  const legacy = result.legacy as Record<string, unknown> | undefined;
  if (!legacy) return null;

  const restId = (result.rest_id as string) ?? (legacy.id_str as string);
  if (!restId) return null;

  // Extract author
  const userResult = getNestedValue(result, [
    'core',
    'user_results',
    'result',
  ]) as Record<string, unknown> | null;

  const userLegacy = userResult?.legacy as
    | Record<string, unknown>
    | undefined;

  const authorHandle =
    (userLegacy?.screen_name as string) ?? 'unknown';
  const authorDisplayName =
    (userLegacy?.name as string) ?? authorHandle;
  const authorAvatarUrl =
    (userLegacy?.profile_image_url_https as string) ?? null;

  // Extract text — prefer note_tweet for long tweets
  const noteText = getNestedValue(result, [
    'note_tweet',
    'note_tweet_results',
    'result',
    'text',
  ]) as string | null;

  const textContent =
    noteText ?? (legacy.full_text as string) ?? '';

  // Extract media
  const media = parseMedia(legacy);

  // Extract metrics
  const metrics = parseMetrics(legacy, result);

  // Determine tweet type
  let tweetType = 'tweet';
  if (legacy.retweeted_status_result) {
    tweetType = 'retweet';
  } else if (legacy.is_quote_status) {
    tweetType = 'quote';
  } else if (
    legacy.in_reply_to_status_id_str ||
    legacy.in_reply_to_screen_name
  ) {
    tweetType = 'reply';
  }

  // Extract created_at
  const createdAt = (legacy.created_at as string) ?? null;
  let tweetCreatedAt: string | null = null;
  if (createdAt) {
    try {
      tweetCreatedAt = new Date(createdAt).toISOString();
    } catch {
      tweetCreatedAt = null;
    }
  }

  return {
    twitter_tweet_id: restId,
    author_handle: authorHandle,
    author_display_name: authorDisplayName,
    author_avatar_url: authorAvatarUrl,
    text_content: textContent,
    media,
    metrics,
    tweet_type: tweetType,
    tweet_created_at: tweetCreatedAt,
  };
}

/**
 * Parse media from legacy.extended_entities.media
 */
function parseMedia(legacy: Record<string, unknown>): ParsedMedia[] {
  const extendedEntities = legacy.extended_entities as
    | Record<string, unknown>
    | undefined;
  if (!extendedEntities) return [];

  const mediaArray = extendedEntities.media as unknown[] | undefined;
  if (!Array.isArray(mediaArray)) return [];

  return mediaArray
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const m = item as Record<string, unknown>;

      const type = m.type as string;
      if (type !== 'photo' && type !== 'video' && type !== 'animated_gif') {
        return null;
      }

      let url = '';
      if (type === 'photo') {
        url = (m.media_url_https as string) ?? '';
      } else {
        // For video/gif, find the highest bitrate variant
        const videoInfo = m.video_info as Record<string, unknown> | undefined;
        const variants = videoInfo?.variants as unknown[] | undefined;
        if (Array.isArray(variants)) {
          const mp4Variants = variants
            .filter(
              (v) =>
                v &&
                typeof v === 'object' &&
                (v as Record<string, unknown>).content_type === 'video/mp4'
            )
            .sort(
              (a, b) =>
                ((b as Record<string, unknown>).bitrate as number) -
                ((a as Record<string, unknown>).bitrate as number)
            );
          if (mp4Variants.length > 0) {
            url = (mp4Variants[0] as Record<string, unknown>).url as string;
          }
        }
      }

      if (!url) return null;

      const sizes = m.sizes as Record<string, unknown> | undefined;
      const large = sizes?.large as Record<string, unknown> | undefined;

      return {
        type: type as 'photo' | 'video' | 'animated_gif',
        url,
        preview_url: (m.media_url_https as string) ?? undefined,
        width: (large?.w as number) ?? undefined,
        height: (large?.h as number) ?? undefined,
      };
    })
    .filter((m): m is ParsedMedia => m !== null);
}

/**
 * Parse metrics from legacy tweet fields.
 */
function parseMetrics(
  legacy: Record<string, unknown>,
  result: Record<string, unknown>
): ParsedMetrics {
  // Views come from a different place
  const viewsCount = getNestedValue(result, ['views', 'count']) as
    | string
    | undefined;

  return {
    likes: (legacy.favorite_count as number) ?? undefined,
    retweets: (legacy.retweet_count as number) ?? undefined,
    replies: (legacy.reply_count as number) ?? undefined,
    quotes: (legacy.quote_count as number) ?? undefined,
    views: viewsCount ? parseInt(viewsCount, 10) : undefined,
  };
}

/**
 * Safely navigate a nested object by a path of keys.
 */
function getNestedValue(
  obj: unknown,
  path: string[]
): unknown | null {
  let current: unknown = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current ?? null;
}
