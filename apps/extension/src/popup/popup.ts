/**
 * Popup script -- UI for the ProfessorX extension popup.
 */

import { getToken, clearToken, setToken, getBackendUrl } from '../lib/auth';

interface SyncStatus {
  pending: number;
  synced: number;
  errors: number;
  lastSync: number | null;
}

const statusEl = document.getElementById('status')!;
const statsEl = document.getElementById('stats')!;
const authSectionEl = document.getElementById('auth-section')!;

async function init(): Promise<void> {
  const token = await getToken();

  if (token) {
    renderConnected();
    await refreshStatus();
  } else {
    renderDisconnected();
  }

  // Check for token in URL hash (from extension-token redirect)
  checkForTokenInUrl();
}

function renderConnected(): void {
  authSectionEl.innerHTML = `
    <div class="auth-status connected">
      <span class="dot green"></span> Connected
    </div>
    <button id="disconnect-btn" class="btn btn-secondary">Disconnect</button>
  `;

  document.getElementById('disconnect-btn')?.addEventListener('click', async () => {
    await clearToken();
    renderDisconnected();
    statusEl.textContent = '';
    statsEl.textContent = '';
  });
}

async function renderDisconnected(): Promise<void> {
  const backendUrl = await getBackendUrl();

  authSectionEl.innerHTML = `
    <div class="auth-status disconnected">
      <span class="dot red"></span> Not connected
    </div>
    <a href="${backendUrl}/api/auth/extension-token" target="_blank" class="btn btn-primary" id="connect-btn">
      Connect to ProfessorX
    </a>
    <div class="token-input-section">
      <input type="text" id="token-input" placeholder="Paste token here..." />
      <button id="save-token-btn" class="btn btn-small">Save</button>
    </div>
  `;

  document.getElementById('save-token-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('token-input') as HTMLInputElement;
    const token = input.value.trim();
    if (token) {
      await setToken(token);
      renderConnected();
      await refreshStatus();
    }
  });
}

async function refreshStatus(): Promise<void> {
  try {
    const status = await new Promise<SyncStatus>((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        resolve(response as SyncStatus);
      });
    });

    renderStatus(status);
  } catch {
    statusEl.innerHTML = '<div class="status-badge idle">Idle</div>';
  }
}

function renderStatus(status: SyncStatus): void {
  const syncState =
    status.pending > 0
      ? '<div class="status-badge syncing">Syncing...</div>'
      : status.errors > 0
        ? '<div class="status-badge error">Error</div>'
        : '<div class="status-badge idle">Idle</div>';

  statusEl.innerHTML = syncState;

  const lastSyncText = status.lastSync
    ? `Last sync: ${new Date(status.lastSync).toLocaleTimeString()}`
    : 'Never synced';

  statsEl.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">Synced</span>
      <span class="stat-value">${status.synced}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Pending</span>
      <span class="stat-value">${status.pending}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Errors</span>
      <span class="stat-value">${status.errors}</span>
    </div>
    <div class="stat-row last-sync">
      ${lastSyncText}
    </div>
  `;
}

function checkForTokenInUrl(): void {
  // Some auth flows pass the token as a query param
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    setToken(token).then(() => {
      renderConnected();
      refreshStatus();
    });
  }
}

// Initialize popup
init();
