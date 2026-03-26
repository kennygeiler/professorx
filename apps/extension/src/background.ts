/**
 * Background service worker -- Manifest V3.
 *
 * Receives parsed tweets from the content script, batches them,
 * and sends them to the ProfessorX backend API.
 */

import { addTweets, flush, getStatus } from './lib/batch-sender';
import type { ParsedTweet } from './lib/tweet-parser';

const SYNC_CHECK_ALARM = 'professorx-sync-check';

// --- Extension lifecycle ---

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ProfessorX] Extension installed');

  // Set up periodic sync check alarm (every 1 minute)
  chrome.alarms.create(SYNC_CHECK_ALARM, { periodInMinutes: 1 });
});

// Re-create alarm on service worker startup (alarms persist but handlers don't)
chrome.alarms.get(SYNC_CHECK_ALARM, (alarm) => {
  if (!alarm) {
    chrome.alarms.create(SYNC_CHECK_ALARM, { periodInMinutes: 1 });
  }
});

// --- Alarm handler ---

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_CHECK_ALARM) {
    const status = getStatus();
    if (status.pending > 0) {
      console.log(
        `[ProfessorX] Sync check: ${status.pending} tweets pending, flushing...`
      );
      flush().catch(console.error);
    }
  }
});

// --- Message handler ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TWEETS_PARSED') {
    const { tweets, sourceType } = message.payload as {
      tweets: ParsedTweet[];
      sourceType: 'like' | 'bookmark';
    };

    addTweets(tweets, sourceType);
    sendResponse({ received: true, count: tweets.length });
  }

  if (message.type === 'GET_STATUS') {
    sendResponse(getStatus());
  }

  if (message.type === 'FORCE_FLUSH') {
    flush()
      .then(() => sendResponse({ success: true, status: getStatus() }))
      .catch((err) =>
        sendResponse({ success: false, error: String(err) })
      );
    return true; // Keep channel open for async response
  }

  return true;
});
