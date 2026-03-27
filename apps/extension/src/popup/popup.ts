/**
 * Popup script — handles everything directly, no service worker dependency.
 */

import { getToken, clearToken, setToken, getTwitterHandle, setTwitterHandle, setBackendUrl, getBackendUrl } from "../lib/auth";

const notConnectedEl = document.getElementById("not-connected")!;
const connectedEl = document.getElementById("connected")!;
const statusEl = document.getElementById("status")!;
const progressBar = document.getElementById("progress-bar")!;
const progressFill = document.getElementById("progress-fill")!;

async function init(): Promise<void> {
  const token = await getToken();
  if (token) {
    showConnected();
    const handle = await getTwitterHandle();
    if (handle) {
      const label = document.getElementById("connected-label");
      if (label) label.textContent = `Connected as @${handle}`;
    }
  } else {
    showNotConnected();
  }
}

function showConnected(): void {
  notConnectedEl.style.display = "none";
  connectedEl.style.display = "block";
}

function showNotConnected(): void {
  notConnectedEl.style.display = "block";
  connectedEl.style.display = "none";
}

function setStatus(text: string, isError = false): void {
  statusEl.textContent = text;
  statusEl.className = isError ? "status error" : "status";
}

function setProgress(pct: number): void {
  progressBar.classList.add("active");
  progressFill.style.width = `${pct}%`;
}

function disableButtons(disabled: boolean): void {
  const buttons = document.querySelectorAll(".btn") as NodeListOf<HTMLButtonElement>;
  buttons.forEach((b) => (b.disabled = disabled));
}

// --- Connect ---
document.getElementById("connect-btn")!.addEventListener("click", async () => {
  const handleInput = document.getElementById("handle-input") as HTMLInputElement;
  const tokenInput = document.getElementById("token-input") as HTMLInputElement;
  const urlInput = document.getElementById("backend-url") as HTMLInputElement;

  const handle = handleInput.value.trim();
  const token = tokenInput.value.trim();
  const backendUrl = urlInput?.value.trim();

  if (!handle) { setStatus("Please enter your Twitter handle", true); return; }
  if (!token) { setStatus("Please enter an API key", true); return; }

  await setTwitterHandle(handle);
  await setToken(token);
  await setBackendUrl(backendUrl || "http://localhost:3000");
  showConnected();

  const label = document.getElementById("connected-label");
  if (label) label.textContent = `Connected as @${handle.replace(/^@/, "")}`;
  setStatus("Connected!");
});

// --- Sync — runs entirely from popup using chrome.tabs + chrome.scripting ---
async function runSync(sources: Array<"like" | "bookmark">): Promise<void> {
  disableButtons(true);
  setProgress(5);

  const handle = await getTwitterHandle();
  if (!handle) {
    setStatus("Error: No Twitter handle. Disconnect and reconnect.", true);
    disableButtons(false);
    return;
  }

  const token = await getToken();
  const backendUrl = await getBackendUrl();
  let totalScraped = 0;
  let totalSent = 0;

  for (const source of sources) {
    const url = source === "like"
      ? `https://x.com/${handle}/likes`
      : "https://x.com/i/bookmarks";

    setStatus(`Opening ${source === "like" ? "likes" : "bookmarks"}...`);

    // Open tab
    const tab = await chrome.tabs.create({ url, active: true });
    if (!tab.id) { setStatus("Failed to open tab", true); continue; }

    // Wait for page to load
    await new Promise<void>((resolve) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });

    setStatus("Page loaded. Injecting scraper...");

    // Inject scraper
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["dist/scraper.js"],
      });
    } catch (err) {
      setStatus(`Failed to inject scraper: ${err}`, true);
      try { await chrome.tabs.remove(tab.id); } catch {}
      continue;
    }

    setStatus("Scraping tweets...");

    // Listen for messages from the scraper
    const scraperDone = await new Promise<number>((resolve) => {
      const onMessage = (message: any, sender: chrome.runtime.MessageSender) => {
        if (sender.tab?.id !== tab.id) return;

        if (message.type === "TWEETS_SCRAPED") {
          const tweets = message.tweets as any[];
          totalScraped += tweets.length;
          setStatus(`Found ${totalScraped} tweets...`);
          setProgress(Math.min(90, 5 + (totalScraped / 10)));

          // Send to backend
          sendBatch(tweets, source, token!, backendUrl).then((sent) => {
            totalSent += sent;
          });
        }

        if (message.type === "SCRAPE_STATUS") {
          setStatus(message.message || `Found ${message.count} tweets...`);
        }

        if (message.type === "SCRAPE_COMPLETE") {
          chrome.runtime.onMessage.removeListener(onMessage);
          resolve(message.count);
        }
      };

      chrome.runtime.onMessage.addListener(onMessage);

      // Safety timeout — 5 minutes max per source
      setTimeout(() => {
        chrome.runtime.onMessage.removeListener(onMessage);
        resolve(totalScraped);
      }, 5 * 60 * 1000);
    });

    // Close tab
    try { await chrome.tabs.remove(tab.id); } catch {}
  }

  // Wait a moment for final batches to send
  await new Promise((r) => setTimeout(r, 2000));

  setProgress(100);
  setStatus(`Done! ${totalScraped} scraped, ${totalSent} sent to backend.`);
  disableButtons(false);
}

async function sendBatch(
  tweets: any[],
  sourceType: string,
  token: string,
  backendUrl: string
): Promise<number> {
  const url = `${backendUrl}/api/tweets/ingest`;
  const payload = {
    tweets: tweets.map((t: any) => ({
      twitter_tweet_id: t.twitter_tweet_id,
      author_handle: t.author_handle || "unknown",
      author_display_name: t.author_display_name || "Unknown",
      author_avatar_url: t.author_avatar_url?.startsWith("http") ? t.author_avatar_url : null,
      text_content: t.text_content || "",
      media: (t.media || []).filter((m: any) => m.url?.startsWith("http")),
      metrics: t.metrics || {},
      tweet_type: t.tweet_type || "tweet",
      source_type: sourceType,
      tweet_created_at: t.tweet_created_at || null,
    })),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return data.total ?? data.inserted ?? 0;
    }
  } catch {}
  return 0;
}

// Wire sync buttons
function setupSyncButton(id: string, sources: Array<"like" | "bookmark">): void {
  document.getElementById(id)!.addEventListener("click", () => runSync(sources));
}
setupSyncButton("sync-both-btn", ["like", "bookmark"]);
setupSyncButton("sync-likes-btn", ["like"]);
setupSyncButton("sync-bookmarks-btn", ["bookmark"]);

// --- Test Connection ---
document.getElementById("test-btn")!.addEventListener("click", async () => {
  setStatus("Testing...");
  const result = await chrome.storage.local.get(["readxlater_auth_token", "readxlater_backend_url"]);
  const token = result.readxlater_auth_token ?? "";
  const backendUrl = result.readxlater_backend_url ?? "http://localhost:3000";
  const url = `${backendUrl}/api/tweets/ingest`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tweets: [{ twitter_tweet_id: "test123", author_handle: "test", author_display_name: "Test", text_content: "Test tweet", source_type: "like" }] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    setStatus(`${res.status === 200 ? "OK" : res.status} → ${url}`);
  } catch (err) {
    setStatus(String(err).includes("abort") ? `Timeout — is ${url} reachable?` : `Failed: ${err}`, true);
  }
});

// --- Check Selectors ---
document.getElementById("check-selectors-btn")!.addEventListener("click", () => {
  const resultsEl = document.getElementById("selector-results")!;
  resultsEl.textContent = "Not available — selectors checked during sync.";
});

// --- Disconnect ---
document.getElementById("disconnect-btn")!.addEventListener("click", async () => {
  await clearToken();
  showNotConnected();
  setStatus("");
  progressBar.classList.remove("active");
});

init();
