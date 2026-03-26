/**
 * Content script — runs on x.com pages.
 *
 * Responsibilities (V1):
 * - Intercept Twitter's internal XHR/fetch responses to capture tweet data
 * - Parse tweet objects from Twitter's internal API JSON as user scrolls
 * - Send parsed tweet batches to the background service worker
 */

console.log('[ProfessorX] Content script loaded on', window.location.href);

// Intercept fetch responses to capture Twitter's internal API data
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const response = await originalFetch(input, init);

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  // Check if this is a Twitter likes or bookmarks API response
  if (url.includes('/Likes') || url.includes('/Bookmarks')) {
    const cloned = response.clone();
    cloned.json().then((data: unknown) => {
      chrome.runtime.sendMessage({
        type: 'TWEET_DATA_INTERCEPTED',
        payload: data,
        url,
      });
    }).catch(() => {
      // Ignore parse errors for non-JSON responses
    });
  }

  return response;
};
