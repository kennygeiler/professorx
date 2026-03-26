/**
 * Content script -- ISOLATED world. Relays parsed tweets from the
 * MAIN world injected script to the background service worker.
 */

console.log('[ProfessorX] Content script loaded (isolated world)');

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'PROFESSORX_TWEETS') return;

  const { tweets, sourceType } = event.data;
  console.log(`[ProfessorX] Relaying ${tweets.length} tweets to background (${sourceType})`);

  chrome.runtime.sendMessage({
    type: 'TWEETS_PARSED',
    payload: { tweets, sourceType },
  });
});
