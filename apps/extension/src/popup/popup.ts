/**
 * Popup script — always shows live sync status.
 */

import { getToken, clearToken, setToken, getTwitterHandle, setTwitterHandle } from "../lib/auth";

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
}

// Connect button
document.getElementById("connect-btn")!.addEventListener("click", async () => {
  const handleInput = document.getElementById("handle-input") as HTMLInputElement;
  const tokenInput = document.getElementById("token-input") as HTMLInputElement;

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

  await setTwitterHandle(handle);
  await setToken(token);
  showConnected();

  const label = document.getElementById("connected-label");
  if (label) label.textContent = `Connected as @${handle.replace(/^@/, "")}`;
  statusEl.textContent = "Connected!";
  startPolling();
});

// Sync buttons
function setupSyncButton(id: string, sources: Array<"like" | "bookmark">): void {
  document.getElementById(id)!.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "START_SYNC", sources });
    statusEl.textContent = "Starting sync...";
    progressBar.classList.add("active");
    progressFill.style.width = "5%";
    const buttons = document.querySelectorAll(".btn") as NodeListOf<HTMLButtonElement>;
    buttons.forEach((b) => (b.disabled = true));
  });
}

setupSyncButton("sync-both-btn", ["like", "bookmark"]);
setupSyncButton("sync-likes-btn", ["like"]);
setupSyncButton("sync-bookmarks-btn", ["bookmark"]);

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
