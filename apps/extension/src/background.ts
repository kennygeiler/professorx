/**
 * Background service worker — Manifest V3.
 *
 * Responsibilities (V1):
 * - Receive intercepted tweet data from content script
 * - Parse and batch tweet objects
 * - Send batches to the ProfessorX backend API (/api/tweets/ingest)
 * - Track sync status
 */

const API_BASE_URL = 'http://localhost:3000'; // Override with production URL via storage

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ProfessorX] Extension installed');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TWEET_DATA_INTERCEPTED') {
    handleInterceptedData(message.payload, message.url).catch(console.error);
    sendResponse({ received: true });
  }
  return true; // Keep message channel open for async response
});

async function handleInterceptedData(data: unknown, url: string): Promise<void> {
  console.log('[ProfessorX] Intercepted data from', url);
  // TODO: Parse Twitter's internal API response format
  // TODO: Extract tweet objects and normalize to IngestTweetPayload format
  // TODO: Batch and send to /api/tweets/ingest
  void data;
}

async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('auth_token');
  return result.auth_token ?? null;
}

export { API_BASE_URL, getAuthToken };
