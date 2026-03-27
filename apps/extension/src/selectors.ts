/**
 * Selector config — all CSS selectors used by the scraper.
 * Stored in chrome.storage so they can be updated without rebuilding.
 * AI auto-heal can patch these when Twitter changes their DOM.
 */

export interface SelectorConfig {
  version: number;
  updated: string;
  selectors: {
    tweetArticle: string;
    tweetText: string;
    tweetTextFallback: string;
    statusLink: string;
    avatar: string;
    time: string;
    mediaPhoto: string;
    video: string;
    replyButton: string;
    retweetButton: string;
    likeButton: string;
    analyticsLink: string;
  };
}

const STORAGE_KEY = "readxlater_selectors";

export const DEFAULT_SELECTORS: SelectorConfig = {
  version: 1,
  updated: "2026-03-27",
  selectors: {
    tweetArticle: 'article[data-testid="tweet"], article[role="article"]',
    tweetText: 'div[data-testid="tweetText"]',
    tweetTextFallback: "div[lang]",
    statusLink: 'a[href*="/status/"]',
    avatar: 'img[src*="profile_images"]',
    time: "time[datetime]",
    mediaPhoto: 'img[src*="pbs.twimg.com/media"]',
    video: "video",
    replyButton: 'button[data-testid="reply"]',
    retweetButton: 'button[data-testid="retweet"]',
    likeButton: 'button[data-testid="like"], button[data-testid="unlike"]',
    analyticsLink: 'a[href*="/analytics"]',
  },
};

export async function getSelectors(): Promise<SelectorConfig> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as SelectorConfig | undefined;
    if (stored?.selectors) return stored;
  } catch {}
  return DEFAULT_SELECTORS;
}

export async function saveSelectors(config: SelectorConfig): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: config });
}
