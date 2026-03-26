/**
 * Content script -- runs on x.com / twitter.com pages.
 *
 * Injects an inline script into the PAGE context (not the isolated content script world)
 * so we can intercept the page's actual window.fetch calls.
 * Captured tweets are posted back to the content script via window.postMessage,
 * then forwarded to the background service worker via chrome.runtime.sendMessage.
 */

console.log('[ProfessorX] Content script loaded on', window.location.href);

// Listen for messages from the injected page script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'PROFESSORX_TWEETS') return;

  const { tweets, sourceType } = event.data;
  console.log(`[ProfessorX] Received ${tweets.length} tweets from page script (${sourceType})`);

  chrome.runtime.sendMessage({
    type: 'TWEETS_PARSED',
    payload: { tweets, sourceType },
  });
});

// Inject the fetch interceptor into the page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('dist/injected.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);
