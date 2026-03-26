/**
 * Content script -- runs at document_start on x.com, BEFORE Twitter's SES lockdown.
 *
 * We inject an inline script (not a file) directly into the page context
 * before Twitter's bundle loads and freezes window.fetch.
 */

const interceptorCode = `
(function() {
  const INTERCEPT_PATTERNS = ['/Likes', '/Bookmarks', '/UserTweets', '/TweetDetail', '/HomeTimeline', '/HomeLatestTimeline'];
  const originalFetch = window.fetch;

  window.fetch = function(...args) {
    const result = originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof URL ? args[0].href : args[0]?.url || '');

      if (INTERCEPT_PATTERNS.some(p => url.includes(p))) {
        result.then(response => {
          const cloned = response.clone();
          cloned.json().then(data => {
            window.postMessage({
              type: 'PROFESSORX_RAW_RESPONSE',
              url: url.split('?')[0],
              data: JSON.stringify(data)
            }, '*');
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch(e) {}

    return result;
  };

  console.log('[ProfessorX] Fetch interceptor installed (pre-lockdown)');
})();
`;

// Inject IMMEDIATELY at document_start, before any other scripts run
const script = document.createElement('script');
script.textContent = interceptorCode;
(document.documentElement || document.head || document.body).prepend(script);
script.remove();

console.log('[ProfessorX] Content script injected interceptor');

// Listen for intercepted responses
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'PROFESSORX_RAW_RESPONSE') return;

  try {
    const data = JSON.parse(event.data.data);
    const url = event.data.url;
    const tweets = parseTweetsFromData(data);

    if (tweets.length > 0) {
      const sourceType = url.includes('/Bookmarks') ? 'bookmark' : 'like';
      console.log('[ProfessorX] Parsed ' + tweets.length + ' tweets from ' + url + ' (' + sourceType + ')');

      chrome.runtime.sendMessage({
        type: 'TWEETS_PARSED',
        payload: { tweets, sourceType },
      });
    }
  } catch (e) {
    console.warn('[ProfessorX] Parse error:', e);
  }
});

function getNestedValue(obj: unknown, path: string[]): unknown | null {
  let current: unknown = obj;
  for (const key of path) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current ?? null;
}

function parseTweetsFromData(data: unknown): Array<{
  twitter_tweet_id: string;
  author_handle: string;
  author_display_name: string;
  author_avatar_url: string | null;
  text_content: string;
  media: Array<{ type: string; url: string; preview_url?: string; width?: number; height?: number }>;
  metrics: { likes?: number; retweets?: number; replies?: number; quotes?: number; views?: number };
  tweet_type: string;
  tweet_created_at: string | null;
}> {
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

  const tweets: ReturnType<typeof parseTweetsFromData> = [];

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

    const authorHandle = (userLegacy?.screen_name as string) ?? 'unknown';
    const authorDisplayName = (userLegacy?.name as string) ?? authorHandle;
    const authorAvatarUrl = (userLegacy?.profile_image_url_https as string) ?? null;

    const noteText = getNestedValue(result, ['note_tweet', 'note_tweet_results', 'result', 'text']) as string | null;
    const textContent = noteText ?? (legacy.full_text as string) ?? '';

    // Media
    const media: typeof tweets[0]['media'] = [];
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

    // Metrics
    const viewsCount = getNestedValue(result, ['views', 'count']) as string | undefined;
    const metrics = {
      likes: (legacy.favorite_count as number) ?? undefined,
      retweets: (legacy.retweet_count as number) ?? undefined,
      replies: (legacy.reply_count as number) ?? undefined,
      quotes: (legacy.quote_count as number) ?? undefined,
      views: viewsCount ? parseInt(viewsCount, 10) : undefined,
    };

    // Tweet type
    let tweetType = 'tweet';
    if (legacy.retweeted_status_result) tweetType = 'retweet';
    else if (legacy.is_quote_status) tweetType = 'quote';
    else if (legacy.in_reply_to_status_id_str) tweetType = 'reply';

    // Created at
    let tweetCreatedAt: string | null = null;
    const createdAt = legacy.created_at as string | undefined;
    if (createdAt) {
      try { tweetCreatedAt = new Date(createdAt).toISOString(); } catch { /* ignore */ }
    }

    tweets.push({
      twitter_tweet_id: restId,
      author_handle: authorHandle,
      author_display_name: authorDisplayName,
      author_avatar_url: authorAvatarUrl,
      text_content: textContent,
      media,
      metrics,
      tweet_type: tweetType,
      tweet_created_at: tweetCreatedAt,
    });
  }

  return tweets;
}
