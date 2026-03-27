/**
 * Background service worker — Manifest V3.
 * Orchestrates the DOM scraper: opens tabs, receives scraped tweets, sends to backend.
 */

import { addTweets, flush, getStatus } from "./lib/batch-sender";
import { getTwitterHandle } from "./lib/auth";

interface SyncState {
  active: boolean;
  source: "like" | "bookmark" | null;
  tabId: number | null;
  count: number;
  status: string;
}

const state: SyncState = {
  active: false,
  source: null,
  tabId: null,
  count: 0,
  status: "idle",
};

let pendingSources: Array<"like" | "bookmark"> = [];

async function startSync(source: "like" | "bookmark"): Promise<void> {
  if (state.active) {
    // Queue it
    pendingSources.push(source);
    return;
  }

  state.active = true;
  state.source = source;
  state.count = 0;
  state.status = `Opening ${source === "like" ? "likes" : "bookmarks"}...`;

  let url: string;
  if (source === "like") {
    const handle = await getTwitterHandle();
    if (!handle) {
      state.status = "Error: No Twitter handle set. Reconnect with your handle.";
      state.active = false;
      return;
    }
    url = `https://x.com/${handle}/likes`;
  } else {
    url = "https://x.com/i/bookmarks";
  }

  // Open a new tab
  const tab = await chrome.tabs.create({ url, active: false });
  state.tabId = tab.id ?? null;

  // Wait for page to load, then inject scraper
  if (tab.id) {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        // Inject the scraper script
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["dist/scraper.js"],
        }).catch((err) => {
          console.error("[Extension] Failed to inject scraper:", err);
          finishSync();
        });
      }
    });
  }
}

async function finishSync(): Promise<void> {
  // Flush remaining tweets
  await flush();

  // Close the tab
  if (state.tabId) {
    try {
      await chrome.tabs.remove(state.tabId);
    } catch { /* tab may already be closed */ }
  }

  state.status = `${state.source === "like" ? "Likes" : "Bookmarks"}: ${state.count} tweets synced`;
  state.active = false;
  state.tabId = null;

  // Process next queued source
  if (pendingSources.length > 0) {
    const next = pendingSources.shift()!;
    startSync(next);
  }
}

// --- Message handler ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "START_SYNC") {
    const { sources } = message as { sources: Array<"like" | "bookmark"> };
    if (sources.length > 0) {
      pendingSources = sources.slice(1);
      startSync(sources[0]);
    }
    sendResponse({ started: true });
    return true;
  }

  if (message.type === "TWEETS_SCRAPED") {
    const tweets = message.tweets as Array<Record<string, unknown>>;
    const sourceType = state.source ?? "like";
    addTweets(tweets as any, sourceType);
    state.count += tweets.length;
    sendResponse({ received: true });
    return true;
  }

  if (message.type === "SCRAPE_STATUS") {
    state.status = message.message;
    state.count = message.count;
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "SCRAPE_COMPLETE") {
    state.count = message.count;
    finishSync();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_STATUS") {
    const batchStatus = getStatus();
    sendResponse({
      ...batchStatus,
      active: state.active,
      source: state.source,
      scraped: state.count,
      status: state.status,
    });
    return true;
  }

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Extension] Installed");
});
