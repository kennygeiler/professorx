/**
 * Auth utilities for the ProfessorX extension.
 * Manages the auth token and backend URL via chrome.storage.local.
 */

const STORAGE_KEYS = {
  AUTH_TOKEN: 'readxlater_auth_token',
  BACKEND_URL: 'readxlater_backend_url',
  TWITTER_HANDLE: 'readxlater_twitter_handle',
} as const;

// Change this to your deployed URL, or leave as localhost for local dev
const DEFAULT_BACKEND_URL = 'http://localhost:3000';

/**
 * Get the stored auth token.
 */
export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
  return (result[STORAGE_KEYS.AUTH_TOKEN] as string) ?? null;
}

/**
 * Store an auth token.
 */
export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
}

/**
 * Clear the stored auth token.
 */
export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Get the backend URL.
 */
export async function getBackendUrl(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.BACKEND_URL);
  return (result[STORAGE_KEYS.BACKEND_URL] as string) ?? DEFAULT_BACKEND_URL;
}

/**
 * Set the backend URL.
 */
export async function setBackendUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.BACKEND_URL]: url });
}

export async function getTwitterHandle(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.TWITTER_HANDLE);
  return (result[STORAGE_KEYS.TWITTER_HANDLE] as string) ?? null;
}

export async function setTwitterHandle(handle: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.TWITTER_HANDLE]: handle.replace(/^@/, '') });
}
