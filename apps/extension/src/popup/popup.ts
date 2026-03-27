/**
 * Popup script — UI for the extension popup.
 */

import { getToken, clearToken, setToken, setBackendUrl, getTwitterHandle, setTwitterHandle } from "../lib/auth";

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

// Connect button
document.getElementById("connect-btn")!.addEventListener("click", async () => {
  const urlInput = document.getElementById("backend-url") as HTMLInputElement;
  const handleInput = document.getElementById("handle-input") as HTMLInputElement;
  const tokenInput = document.getElementById("token-input") as HTMLInputElement;

  const url = urlInput.value.trim();
  const handle = handleInput.value.trim();
  const token = tokenInput.value.trim();

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

  if (url) await setBackendUrl(url);
  await setTwitterHandle(handle);
  await setToken(token);
  showConnected();

  const label = document.getElementById("connected-label");
  if (label) label.textContent = `Connected as @${handle.replace(/^@/, "")}`;
  statusEl.textContent = "Connected!";
});

// Sync buttons
function setupSyncButton(id: string, sources: Array<"like" | "bookmark">): void {
  document.getElementById(id)!.addEventListener("click", () => {
    startSync(sources);
  });
}

setupSyncButton("sync-both-btn", ["like", "bookmark"]);
setupSyncButton("sync-likes-btn", ["like"]);
setupSyncButton("sync-bookmarks-btn", ["bookmark"]);

async function startSync(sources: Array<"like" | "bookmark">): Promise<void> {
  // Disable all sync buttons
  const buttons = document.querySelectorAll(".btn") as NodeListOf<HTMLButtonElement>;
  buttons.forEach((b) => (b.disabled = true));

  progressBar.classList.add("active");
  progressFill.style.width = "5%";
  statusEl.textContent = "Starting sync...";
  statusEl.className = "status";

  chrome.runtime.sendMessage({ type: "START_SYNC", sources });

  // Poll for status
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      if (!response) return;

      statusEl.textContent = response.status || `${response.scraped} tweets found`;

      // Estimate progress (assume max ~2000 tweets)
      const pct = Math.min(95, (response.scraped / 20) * 1);
      progressFill.style.width = `${Math.max(pct, 5)}%`;

      if (!response.active && response.scraped > 0) {
        // Sync complete
        progressFill.style.width = "100%";
        statusEl.textContent = `Done! ${response.scraped} tweets synced (${response.synced} sent to backend)`;

        buttons.forEach((b) => (b.disabled = false));
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    });
  }, 1000);
}

// Disconnect
document.getElementById("disconnect-btn")!.addEventListener("click", async () => {
  await clearToken();
  showNotConnected();
  statusEl.textContent = "";
  progressBar.classList.remove("active");
});

init();
