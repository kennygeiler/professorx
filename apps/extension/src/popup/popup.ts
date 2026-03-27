/**
 * Popup script — always shows live sync status.
 */

import { getToken, clearToken, setToken, getTwitterHandle, setTwitterHandle, setBackendUrl } from "../lib/auth";

const notConnectedEl = document.getElementById("not-connected")!;
const connectedEl = document.getElementById("connected")!;
const statusEl = document.getElementById("status")!;
const progressBar = document.getElementById("progress-bar")!;
const progressFill = document.getElementById("progress-fill")!;

let pollInterval: ReturnType<typeof setInterval> | null = null;

async function init(): Promise<void> {
  const token = await getToken();
  if (token) {
    showConnected();
    const handle = await getTwitterHandle();
    if (handle) {
      const label = document.getElementById("connected-label");
      if (label) label.textContent = `Connected as @${handle}`;
    }
    // Always start polling — picks up active syncs
    startPolling();
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

function startPolling(): void {
  if (pollInterval) return;
  updateStatus(); // Immediate first check
  pollInterval = setInterval(updateStatus, 1000);
}

function updateStatus(): void {
  try { chrome.runtime.connect({ name: "poll" }).disconnect(); } catch {}
  setTimeout(() => {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      if (chrome.runtime.lastError || !response) return;

    const buttons = document.querySelectorAll(".btn") as NodeListOf<HTMLButtonElement>;

    if (response.active) {
      // Sync in progress
      progressBar.classList.add("active");
      const pct = Math.min(95, Math.max(5, (response.scraped / 10) * 1));
      progressFill.style.width = `${pct}%`;
      statusEl.textContent = response.status || `Scraping... ${response.scraped} tweets found`;
      buttons.forEach((b) => (b.disabled = true));
    } else if (response.scraped > 0 || response.synced > 0) {
      // Sync finished
      progressBar.classList.add("active");
      progressFill.style.width = "100%";

      const parts = [];
      if (response.scraped > 0) parts.push(`${response.scraped} scraped`);
      if (response.synced > 0) parts.push(`${response.synced} sent to backend`);
      if (response.errors > 0) parts.push(`${response.errors} errors`);
      if (response.pending > 0) parts.push(`${response.pending} pending`);

      statusEl.textContent = response.status || parts.join(", ");
      buttons.forEach((b) => (b.disabled = false));
    } else {
      // Idle
      progressBar.classList.remove("active");
      statusEl.textContent = response.status || "Ready to sync";
      buttons.forEach((b) => (b.disabled = false));
    }
    });
  }, 200);
}

// Connect button
document.getElementById("connect-btn")!.addEventListener("click", async () => {
  const handleInput = document.getElementById("handle-input") as HTMLInputElement;
  const tokenInput = document.getElementById("token-input") as HTMLInputElement;
  const urlInput = document.getElementById("backend-url") as HTMLInputElement;

  const handle = handleInput.value.trim();
  const token = tokenInput.value.trim();
  const backendUrl = urlInput?.value.trim();

  if (!handle) {
    statusEl.textContent = "Please enter your Twitter handle";
    statusEl.className = "status error";
    return;
  }

  if (!token) {
    statusEl.textContent = "Please enter a token";
    statusEl.className = "status error";
    return;
  }

  await setTwitterHandle(handle);
  await setToken(token);
  await setBackendUrl(backendUrl || "http://localhost:3000");
  showConnected();

  const label = document.getElementById("connected-label");
  if (label) label.textContent = `Connected as @${handle.replace(/^@/, "")}`;
  statusEl.textContent = "Connected!";
  startPolling();
});

// Send message to background — uses port to wake the service worker
async function sendToBackground(msg: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000);
    try {
      // chrome.runtime.connect() wakes the service worker in Manifest V3
      const port = chrome.runtime.connect({ name: "popup" });
      port.disconnect();
    } catch {}

    // Small delay to let the worker start, then send the message
    setTimeout(() => {
      chrome.runtime.sendMessage(msg, (response) => {
        clearTimeout(timeout);
        chrome.runtime.lastError; // clear
        resolve(response);
      });
    }, 300);
  });
}

// Sync buttons
function setupSyncButton(id: string, sources: Array<"like" | "bookmark">): void {
  document.getElementById(id)!.addEventListener("click", async () => {
    statusEl.textContent = "Waking up...";
    progressBar.classList.add("active");
    progressFill.style.width = "5%";
    const buttons = document.querySelectorAll(".btn") as NodeListOf<HTMLButtonElement>;
    buttons.forEach((b) => (b.disabled = true));

    await sendToBackground({ type: "START_SYNC", sources });
    statusEl.textContent = "Starting sync...";
  });
}

setupSyncButton("sync-both-btn", ["like", "bookmark"]);
setupSyncButton("sync-likes-btn", ["like"]);
setupSyncButton("sync-bookmarks-btn", ["bookmark"]);

// Test connection — do the fetch directly from popup instead of relying on service worker
document.getElementById("test-btn")!.addEventListener("click", async () => {
  statusEl.textContent = "Testing...";

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
    statusEl.textContent = `${res.status === 200 ? "OK" : res.status} → ${url}`;
  } catch (err) {
    const msg = String(err);
    if (msg.includes("abort")) {
      statusEl.textContent = `Timeout — is ${url} reachable?`;
    } else {
      statusEl.textContent = `Failed: ${msg}`;
    }
    statusEl.className = "status error";
  }
});

// Check selectors
document.getElementById("check-selectors-btn")!.addEventListener("click", () => {
  const resultsEl = document.getElementById("selector-results")!;
  resultsEl.textContent = "Checking selectors (opening Twitter tab)...";
  chrome.runtime.sendMessage({ type: "RUN_INSPECTION" }, (response) => {
    if (chrome.runtime.lastError || !response?.results) {
      resultsEl.textContent = "Inspection failed — are you logged into Twitter?";
      return;
    }
    const lines: string[] = [];
    for (const [name, result] of Object.entries(response.results) as [string, { found: number }][]) {
      const icon = result.found > 0 ? "OK" : "BROKEN";
      lines.push(`${icon} ${name}: ${result.found}`);
    }
    resultsEl.innerHTML = lines.map((l) =>
      l.startsWith("OK") ? `<div style="color:#22c55e">${l}</div>` : `<div style="color:#ef4444">${l}</div>`
    ).join("");
  });
});

// Disconnect
document.getElementById("disconnect-btn")!.addEventListener("click", async () => {
  await clearToken();
  showNotConnected();
  statusEl.textContent = "";
  progressBar.classList.remove("active");
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
});

init();
