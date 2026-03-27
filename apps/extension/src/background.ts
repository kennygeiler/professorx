/**
 * Background service worker — orchestrates scraping, inspecting, and auto-healing.
 */

import { addTweets, flush, getStatus } from "./lib/batch-sender";
import { getTwitterHandle, getBackendUrl, getToken } from "./lib/auth";
import { getSelectors, saveSelectors, DEFAULT_SELECTORS } from "./selectors";
import type { SelectorConfig } from "./selectors";

const HEALTH_CHECK_ALARM = "readxlater-health-check";

interface SyncState {
  active: boolean;
  source: "like" | "bookmark" | null;
  tabId: number | null;
  count: number;
  status: string;
}

const state: SyncState = {
  active: false, source: null, tabId: null, count: 0, status: "idle",
};

let pendingSources: Array<"like" | "bookmark"> = [];

// --- Sync flow ---

async function startSync(source: "like" | "bookmark"): Promise<void> {
  if (state.active) { pendingSources.push(source); return; }

  state.active = true;
  state.source = source;
  state.count = 0;
  state.status = `Opening ${source === "like" ? "likes" : "bookmarks"}...`;

  let url: string;
  if (source === "like") {
    const handle = await getTwitterHandle();
    if (!handle) {
      state.status = "Error: No Twitter handle set.";
      state.active = false;
      return;
    }
    url = `https://x.com/${handle}/likes`;
  } else {
    url = "https://x.com/i/bookmarks";
  }

  const tab = await chrome.tabs.create({ url, active: true });
  state.tabId = tab.id ?? null;

  if (tab.id) {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.scripting.executeScript({
          target: { tabId },
          files: ["dist/scraper.js"],
        }).catch(() => finishSync());
      }
    });
  }
}

async function finishSync(): Promise<void> {
  await flush();
  if (state.tabId) {
    try { await chrome.tabs.remove(state.tabId); } catch {}
  }
  state.status = `${state.source === "like" ? "Likes" : "Bookmarks"}: ${state.count} tweets synced`;
  state.active = false;
  state.tabId = null;

  if (pendingSources.length > 0) {
    startSync(pendingSources.shift()!);
  }
}

// --- Inspector flow ---

async function runInspection(): Promise<Record<string, { found: number; sample?: string }> | null> {
  const tab = await chrome.tabs.create({ url: "https://x.com/home", active: false });
  if (!tab.id) return null;

  return new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);

        // Wait for content to load
        setTimeout(async () => {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id! },
              files: ["dist/inspector.js"],
            });

            const config = await getSelectors();

            // Send selectors to inspector and wait for results
            chrome.tabs.sendMessage(tab.id!, {
              type: "INSPECT_SELECTORS",
              selectors: config.selectors,
            }, async (response) => {
              try { await chrome.tabs.remove(tab.id!); } catch {}
              resolve(response?.results ?? null);
            });
          } catch {
            try { await chrome.tabs.remove(tab.id!); } catch {}
            resolve(null);
          }
        }, 4000);
      }
    });
  });
}

async function healSelectors(
  broken: Record<string, string>,
  domSnapshot: string
): Promise<Record<string, string> | null> {
  const backendUrl = await getBackendUrl();
  const token = await getToken();
  const config = await getSelectors();

  try {
    const res = await fetch(`${backendUrl}/api/selectors/heal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        brokenSelectors: broken,
        domSnapshot,
        currentSelectors: config.selectors,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.fixes ?? null;
  } catch {
    return null;
  }
}

// --- Daily health check ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === HEALTH_CHECK_ALARM) {
    console.log("[Health] Running daily selector check");
    const results = await runInspection();
    if (!results) return;

    const config = await getSelectors();
    const broken: Record<string, string> = {};

    for (const [name, result] of Object.entries(results)) {
      if (result.found === 0) {
        broken[name] = (config.selectors as Record<string, string>)[name] ?? "";
      }
    }

    if (Object.keys(broken).length > 0) {
      console.log("[Health] Broken selectors:", Object.keys(broken));
      // Get DOM snapshot for healing
      // (would need the inspector to also return domSnapshot — simplified here)
    }
  }
});

// --- Message handler ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    addTweets(tweets as any, state.source ?? "like");
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

  if (message.type === "GET_SELECTORS") {
    getSelectors().then((config) => {
      // Send selectors to the scraper tab
      if (state.tabId) {
        chrome.tabs.sendMessage(state.tabId, {
          type: "SET_SELECTORS",
          selectors: config.selectors,
        }).catch(() => {});
      }
      sendResponse(config.selectors);
    });
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

  if (message.type === "RUN_INSPECTION") {
    runInspection().then((results) => {
      sendResponse({ results });
    });
    return true;
  }

  if (message.type === "HEAL_SELECTORS") {
    (async () => {
      const { broken, domSnapshot } = message;
      const fixes = await healSelectors(broken, domSnapshot);
      if (fixes) {
        const config = await getSelectors();
        const updated: SelectorConfig = {
          ...config,
          version: config.version + 1,
          updated: new Date().toISOString().split("T")[0],
          selectors: { ...config.selectors, ...fixes },
        };
        await saveSelectors(updated);
        sendResponse({ success: true, fixes });
      } else {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  if (message.type === "TEST_INGEST") {
    (async () => {
      const token = await getToken();
      const backendUrl = await getBackendUrl();
      try {
        const res = await fetch(`${backendUrl}/api/tweets/ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tweets: [{ twitter_tweet_id: "test123", author_handle: "test", author_display_name: "Test", text_content: "Test tweet", source_type: "like" }] }),
        });
        const body = await res.text();
        sendResponse({ status: res.status, body });
      } catch (err) {
        sendResponse({ error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === "INSPECTOR_READY") {
    sendResponse({ ok: true });
    return true;
  }

  return true;
});

// --- Lifecycle ---

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Extension] Installed");
  chrome.alarms.create(HEALTH_CHECK_ALARM, {
    periodInMinutes: 24 * 60, // once per day
    delayInMinutes: 60, // first check after 1 hour
  });
});
