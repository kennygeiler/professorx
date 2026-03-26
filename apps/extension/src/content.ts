/**
 * Content script -- runs on x.com / twitter.com pages.
 *
 * Intercepts Twitter's internal fetch calls to capture tweet data from
 * API responses as the user scrolls through likes, bookmarks, timelines, etc.
 * Parsed tweets are sent to the background service worker.
 */

import { parseTweetsFromResponse } from './lib/tweet-parser';

console.log('[ProfessorX] Content script loaded on', window.location.href);

// Patterns we want to intercept
const INTERCEPT_PATTERNS = [
  '/UserTweets',
  '/Likes',
  '/Bookmarks',
  '/TweetDetail',
] as const;

/**
 * Determine the source type based on the URL pattern.
 */
function getSourceType(url: string): 'like' | 'bookmark' {
  if (url.includes('/Bookmarks')) return 'bookmark';
  if (url.includes('/Likes')) return 'like';
  // Default to 'like' for timeline and detail views
  return 'like';
}

/**
 * Check if a URL matches any of our intercept patterns.
 */
function shouldIntercept(url: string): boolean {
  return INTERCEPT_PATTERNS.some((pattern) => url.includes(pattern));
}

// Override window.fetch to intercept Twitter API responses
const originalFetch = window.fetch.bind(window);

window.fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const response = await originalFetch(input, init);

  try {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (shouldIntercept(url)) {
      // Clone to avoid consuming the response body
      const cloned = response.clone();

      cloned
        .json()
        .then((data: unknown) => {
          const tweets = parseTweetsFromResponse(data, url);

          if (tweets.length > 0) {
            const sourceType = getSourceType(url);

            console.log(
              `[ProfessorX] Parsed ${tweets.length} tweets from ${url.split('?')[0]} (source: ${sourceType})`
            );

            chrome.runtime.sendMessage({
              type: 'TWEETS_PARSED',
              payload: { tweets, sourceType },
            });
          }
        })
        .catch(() => {
          // Ignore parse errors for non-JSON responses
        });
    }
  } catch {
    // Don't let our interception break the page
  }

  return response;
};
