/**
 * DOM scraper — extracts tweets by auto-scrolling.
 * Communicates via chrome.storage (reliable, no service worker needed).
 */

interface ScrapedTweet {
  twitter_tweet_id: string;
  author_handle: string;
  author_display_name: string;
  author_avatar_url: string | null;
  text_content: string;
  media: Array<{ type: "photo" | "video" | "animated_gif"; url: string; preview_url?: string }>;
  metrics: { likes?: number; retweets?: number; replies?: number; views?: number };
  tweet_type: string;
  tweet_created_at: string | null;
}

const seenIds = new Set<string>();
let totalScraped = 0;
let allTweets: ScrapedTweet[] = [];

function parseMetricText(text: string | null): number | undefined {
  if (!text) return undefined;
  const match = text.match(/([\d,.]+)\s*([KMB])?/i);
  if (!match) return undefined;
  let num = parseFloat(match[1].replace(/,/g, ""));
  const suffix = match[2]?.toUpperCase();
  if (suffix === "K") num *= 1000;
  if (suffix === "M") num *= 1_000_000;
  if (suffix === "B") num *= 1_000_000_000;
  return Math.round(num) || undefined;
}

function extractTweetFromArticle(article: Element): ScrapedTweet | null {
  try {
    const allLinks = article.querySelectorAll("a[href]");
    let tweetId: string | null = null;
    for (const link of allLinks) {
      const match = (link.getAttribute("href") ?? "").match(/\/status\/(\d+)/);
      if (match) { tweetId = match[1]; break; }
    }
    if (!tweetId || seenIds.has(tweetId)) return null;
    seenIds.add(tweetId);

    let authorHandle = "unknown";
    let authorDisplayName = "Unknown";
    for (const link of allLinks) {
      const href = link.getAttribute("href") ?? "";
      if (href.match(/^\/[A-Za-z0-9_]{1,15}$/) && !href.includes("/status/")) {
        authorHandle = href.slice(1);
        const nameSpan = link.querySelector("span");
        if (nameSpan?.textContent) authorDisplayName = nameSpan.textContent.trim();
        break;
      }
    }

    const avatarImg = article.querySelector('img[src*="profile_images"]');
    const textDiv = article.querySelector('div[data-testid="tweetText"]') || article.querySelector("div[lang]");
    const timeEl = article.querySelector("time");

    const media: ScrapedTweet["media"] = [];
    for (const img of article.querySelectorAll("img")) {
      const src = img.getAttribute("src") ?? "";
      if (src.includes("pbs.twimg.com/media")) media.push({ type: "photo", url: src });
    }
    for (const vid of article.querySelectorAll("video")) {
      const src = vid.getAttribute("src") ?? (vid.querySelector("source") as HTMLSourceElement)?.getAttribute("src") ?? "";
      const poster = vid.getAttribute("poster") ?? "";
      if (src || poster) media.push({ type: "video", url: src || poster, preview_url: poster || undefined });
    }

    const metrics: ScrapedTweet["metrics"] = {};
    for (const btn of article.querySelectorAll('[role="button"], button')) {
      const label = btn.getAttribute("aria-label")?.toLowerCase() ?? "";
      if (label.includes("repl")) metrics.replies = parseMetricText(label);
      else if (label.includes("repost") || label.includes("retweet")) metrics.retweets = parseMetricText(label);
      else if (label.includes("like")) metrics.likes = parseMetricText(label);
      else if (label.includes("view")) metrics.views = parseMetricText(label);
    }

    let tweetType = "tweet";
    if ((article.textContent?.toLowerCase() ?? "").includes("retweeted")) tweetType = "retweet";
    if (article.querySelector('div[role="link"]')?.textContent?.includes("@")) tweetType = "quote";

    return {
      twitter_tweet_id: tweetId, author_handle: authorHandle,
      author_display_name: authorDisplayName,
      author_avatar_url: avatarImg?.getAttribute("src") ?? null,
      text_content: textDiv?.textContent?.trim() ?? "",
      media, metrics, tweet_type: tweetType,
      tweet_created_at: timeEl?.getAttribute("datetime") ?? null,
    };
  } catch { return null; }
}

function extractAllTweets(): ScrapedTweet[] {
  const articles = document.querySelectorAll('article[data-testid="tweet"], article[role="article"]');
  const tweets: ScrapedTweet[] = [];
  for (const article of articles) {
    const tweet = extractTweetFromArticle(article);
    if (tweet) tweets.push(tweet);
  }
  return tweets;
}

// Write state to chrome.storage so the popup can read it
async function writeState(status: string, done: boolean = false): Promise<void> {
  await chrome.storage.local.set({
    readxlater_scraper: {
      status,
      count: totalScraped,
      tweets: allTweets,
      done,
      timestamp: Date.now(),
    },
  });
}

async function autoScroll(): Promise<void> {
  let noNewTweetsCount = 0;
  const maxNoNew = 6;
  const scrollDelay = 600;

  await writeState("Waiting for page to load...");
  await new Promise((r) => setTimeout(r, 2000));

  while (noNewTweetsCount < maxNoNew) {
    const beforeCount = seenIds.size;
    const newTweets = extractAllTweets();
    if (newTweets.length > 0) {
      totalScraped += newTweets.length;
      allTweets.push(...newTweets);
      await writeState(`Found ${totalScraped} tweets...`);
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, scrollDelay));
    if (seenIds.size === beforeCount) noNewTweetsCount++;
    else noNewTweetsCount = 0;
  }

  const finalTweets = extractAllTweets();
  if (finalTweets.length > 0) {
    totalScraped += finalTweets.length;
    allTweets.push(...finalTweets);
  }

  await writeState(`Done! ${totalScraped} tweets scraped.`, true);
}

autoScroll();
