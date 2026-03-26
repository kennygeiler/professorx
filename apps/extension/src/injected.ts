/**
 * Injected script -- runs in MAIN world via manifest "world": "MAIN".
 * Executes at document_start BEFORE Twitter's SES lockdown.
 * Overrides window.fetch to capture API responses, then posts parsed
 * tweets to the ISOLATED world content script via window.postMessage.
 */

const INTERCEPT_PATTERNS = [
  '/Likes',
  '/Bookmarks',
  '/UserTweets',
  '/TweetDetail',
  '/HomeTimeline',
  '/HomeLatestTimeline',
];

function shouldIntercept(url: string): boolean {
  return INTERCEPT_PATTERNS.some((p) => url.includes(p));
}

function getSourceType(url: string): 'like' | 'bookmark' {
  if (url.includes('/Bookmarks')) return 'bookmark';
  return 'like';
}

function getNestedValue(obj: unknown, path: string[]): unknown | null {
  let current: unknown = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current ?? null;
}

function extractAndParseTweets(data: unknown): unknown[] {
  const entries: unknown[] = [];

  function findEntries(obj: unknown, depth: number): void {
    if (depth > 10 || !obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (const item of obj) findEntries(item, depth + 1);
      return;
    }
    const rec = obj as Record<string, unknown>;
    for (const key of Object.keys(rec)) {
      if (key === 'entries' && Array.isArray(rec[key])) {
        entries.push(...(rec[key] as unknown[]));
      }
      findEntries(rec[key], depth + 1);
    }
  }
  findEntries(data, 0);

  const tweets: unknown[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;

    const tweetResult =
      getNestedValue(rec, ['content', 'itemContent', 'tweet_results', 'result']) ??
      getNestedValue(rec, ['item', 'itemContent', 'tweet_results', 'result']);

    if (!tweetResult || typeof tweetResult !== 'object') continue;

    let result = tweetResult as Record<string, unknown>;
    if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) {
      result = result.tweet as Record<string, unknown>;
    }
    if (result.__typename !== 'Tweet' && result.__typename !== undefined) continue;

    const legacy = result.legacy as Record<string, unknown> | undefined;
    if (!legacy) continue;

    const restId = (result.rest_id as string) ?? (legacy.id_str as string);
    if (!restId) continue;

    const userResult = getNestedValue(result, ['core', 'user_results', 'result']) as Record<string, unknown> | null;
    const userLegacy = userResult?.legacy as Record<string, unknown> | undefined;

    const noteText = getNestedValue(result, ['note_tweet', 'note_tweet_results', 'result', 'text']) as string | null;

    // Media
    const media: unknown[] = [];
    const extEntities = legacy.extended_entities as Record<string, unknown> | undefined;
    const mediaArray = extEntities?.media as unknown[] | undefined;
    if (Array.isArray(mediaArray)) {
      for (const item of mediaArray) {
        if (!item || typeof item !== 'object') continue;
        const m = item as Record<string, unknown>;
        const type = m.type as string;
        if (type !== 'photo' && type !== 'video' && type !== 'animated_gif') continue;
        let url = '';
        if (type === 'photo') {
          url = (m.media_url_https as string) ?? '';
        } else {
          const variants = (getNestedValue(m, ['video_info', 'variants']) as unknown[]) ?? [];
          const mp4s = variants
            .filter((v: unknown) => v && typeof v === 'object' && (v as Record<string, unknown>).content_type === 'video/mp4')
            .sort((a: unknown, b: unknown) => ((b as Record<string, unknown>).bitrate as number) - ((a as Record<string, unknown>).bitrate as number));
          if (mp4s.length > 0) url = (mp4s[0] as Record<string, unknown>).url as string;
        }
        if (!url) continue;
        const sizes = m.sizes as Record<string, unknown> | undefined;
        const large = sizes?.large as Record<string, unknown> | undefined;
        media.push({ type, url, preview_url: (m.media_url_https as string) ?? undefined, width: (large?.w as number) ?? undefined, height: (large?.h as number) ?? undefined });
      }
    }

    const viewsCount = getNestedValue(result, ['views', 'count']) as string | undefined;

    let tweetType = 'tweet';
    if (legacy.retweeted_status_result) tweetType = 'retweet';
    else if (legacy.is_quote_status) tweetType = 'quote';
    else if (legacy.in_reply_to_status_id_str) tweetType = 'reply';

    let tweetCreatedAt: string | null = null;
    const createdAt = legacy.created_at as string | undefined;
    if (createdAt) {
      try { tweetCreatedAt = new Date(createdAt).toISOString(); } catch { /* ignore */ }
    }

    tweets.push({
      twitter_tweet_id: restId,
      author_handle: (userLegacy?.screen_name as string) ?? 'unknown',
      author_display_name: (userLegacy?.name as string) ?? 'unknown',
      author_avatar_url: (userLegacy?.profile_image_url_https as string) ?? null,
      text_content: noteText ?? (legacy.full_text as string) ?? '',
      media,
      metrics: {
        likes: (legacy.favorite_count as number) ?? undefined,
        retweets: (legacy.retweet_count as number) ?? undefined,
        replies: (legacy.reply_count as number) ?? undefined,
        quotes: (legacy.quote_count as number) ?? undefined,
        views: viewsCount ? parseInt(viewsCount, 10) : undefined,
      },
      tweet_type: tweetType,
      tweet_created_at: tweetCreatedAt,
    });
  }

  return tweets;
}

// Override fetch BEFORE Twitter's SES lockdown
const originalFetch = window.fetch;

window.fetch = function (...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
  const result = originalFetch.apply(this, args);

  try {
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request)?.url ?? '';

    // Debug: log all graphql fetch URLs
    if (url.includes('graphql') || url.includes('api.x.com') || url.includes('api.twitter.com')) {
      console.log('[ProfessorX][DEBUG] Fetch:', url.split('?')[0]);
    }

    if (shouldIntercept(url)) {
      result.then((response) => {
        const cloned = response.clone();
        cloned.json().then((data: unknown) => {
          const tweets = extractAndParseTweets(data);
          if (tweets.length > 0) {
            console.log(`[ProfessorX] Captured ${tweets.length} tweets from ${url.split('?')[0]}`);
            window.postMessage({ type: 'PROFESSORX_TWEETS', tweets, sourceType: getSourceType(url) }, '*');
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  } catch { /* don't break the page */ }

  return result;
};

console.log('[ProfessorX] Fetch interceptor installed (MAIN world, pre-lockdown)');
