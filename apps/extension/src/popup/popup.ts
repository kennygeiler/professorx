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

// --- Sync — just opens the tab. Scraper handles everything from there. ---
async function runSync(sources: Array<"like" | "bookmark">): Promise<void> {
  const handle = await getTwitterHandle();
  if (!handle) {
    setStatus("Error: No Twitter handle. Disconnect and reconnect.", true);
    return;
  }

  // Clear previous state
  await chrome.storage.local.remove("readxlater_scraper");

  for (const source of sources) {
    const url = source === "like"
      ? `https://x.com/${handle}/likes`
      : "https://x.com/i/bookmarks";

    setStatus(`Opening ${source === "like" ? "likes" : "bookmarks"}...`);

    // Open tab — scraper auto-injects via content_scripts in manifest
    // But we need to inject manually since it's not a content script
    const tab = await chrome.tabs.create({ url, active: true });

    if (tab.id) {
      // Wait for load, then inject
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["dist/scraper.js"],
          }).catch(() => {});
        }
      });
    }
  }

  setStatus("Scraper running in the Twitter tab. Watch the overlay there.");
  setProgress(50);
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

// --- Check Selectors — runs directly from popup ---
document.getElementById("check-selectors-btn")!.addEventListener("click", async () => {
  const resultsEl = document.getElementById("selector-results")!;
  resultsEl.textContent = "Opening Twitter to check selectors...";

  const tab = await chrome.tabs.create({ url: "https://x.com/home", active: true });
  if (!tab.id) { resultsEl.textContent = "Failed to open tab"; return; }

  // Wait for load
  await new Promise<void>((resolve) => {
    const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });

  await new Promise((r) => setTimeout(r, 3000));

  // Test selectors directly in the tab
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selectors: Record<string, string> = {
          tweetArticle: 'article[data-testid="tweet"], article[role="article"]',
          tweetText: 'div[data-testid="tweetText"]',
          statusLink: 'a[href*="/status/"]',
          avatar: 'img[src*="profile_images"]',
          time: "time[datetime]",
          video: "video",
        };
        const out: Record<string, number> = {};
        for (const [name, sel] of Object.entries(selectors)) {
          out[name] = document.querySelectorAll(sel).length;
        }
        return out;
      },
    });

    await chrome.tabs.remove(tab.id);

    const data = results[0]?.result as Record<string, number> | undefined;
    if (!data) { resultsEl.textContent = "No results"; return; }

    resultsEl.innerHTML = Object.entries(data)
      .map(([name, count]) =>
        count > 0
          ? `<div style="color:#22c55e">OK ${name}: ${count}</div>`
          : `<div style="color:#ef4444">BROKEN ${name}: 0</div>`
      )
      .join("");
  } catch (err) {
    try { await chrome.tabs.remove(tab.id); } catch {}
    resultsEl.textContent = `Error: ${err}`;
  }
});

// --- Disconnect ---
document.getElementById("disconnect-btn")!.addEventListener("click", async () => {
  await clearToken();
  showNotConnected();
  setStatus("");
  progressBar.classList.remove("active");
});

init();
