/**
 * DOM scraper — extracts tweets by auto-scrolling and sends them directly to the backend.
 * Runs entirely within the Twitter tab. No popup, no service worker, no message passing.
 *
 * Reads config from chrome.storage: backend URL, API key.
 * Shows a floating status overlay on the Twitter page.
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
let totalSent = 0;

// --- Floating status overlay ---
function createOverlay(): HTMLDivElement {
  const el = document.createElement("div");
  el.id = "readxlater-overlay";
  el.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 999999;
    background: #09090b; border: 1px solid #27272a; border-radius: 12px;
    padding: 12px 16px; min-width: 220px; font-family: system-ui, sans-serif;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  `;
  el.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:#e4e4e7;margin-bottom:6px;">readXlater</div>
    <div id="rxl-status" style="font-size:11px;color:#1d9bf0;">Starting...</div>
    <div style="margin-top:6px;height:3px;background:#27272a;border-radius:99px;overflow:hidden;">
      <div id="rxl-progress" style="height:100%;background:#1d9bf0;width:0%;transition:width 0.3s;border-radius:99px;"></div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

function updateOverlay(status: string, pct: number): void {
  const statusEl = document.getElementById("rxl-status");
  const progressEl = document.getElementById("rxl-progress");
  if (statusEl) statusEl.textContent = status;
  if (progressEl) progressEl.style.width = `${pct}%`;
}

function removeOverlay(): void {
  document.getElementById("readxlater-overlay")?.remove();
}

// --- Tweet extraction ---
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

    let authorHandle = "unknown", authorDisplayName = "Unknown";
    for (const link of allLinks) {
      const href = link.getAttribute("href") ?? "";
      if (href.match(/^\/[A-Za-z0-9_]{1,15}$/) && !href.includes("/status/")) {
        authorHandle = href.slice(1);
        const span = link.querySelector("span");
        if (span?.textContent) authorDisplayName = span.textContent.trim();
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

// --- Send to backend ---
async function sendBatch(tweets: ScrapedTweet[], sourceType: string, token: string, backendUrl: string): Promise<number> {
  const payload = {
    tweets: tweets.map((t) => ({
      ...t,
      author_avatar_url: t.author_avatar_url?.startsWith("http") ? t.author_avatar_url : null,
      media: t.media.filter((m) => m.url.startsWith("http")),
      source_type: sourceType,
      tweet_created_at: t.tweet_created_at || null,
    })),
  };
  try {
    const res = await fetch(`${backendUrl}/api/tweets/ingest`, {
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

// --- Main ---
async function main(): Promise<void> {
  createOverlay();
  updateOverlay("Reading config...", 0);

  // Read config from chrome.storage
  const config = await chrome.storage.local.get(["readxlater_auth_token", "readxlater_backend_url"]);
  const token = config.readxlater_auth_token;
  const backendUrl = config.readxlater_backend_url || "http://localhost:3000";

  if (!token) {
    updateOverlay("Error: No API key set. Connect in the extension popup.", 0);
    return;
  }

  // Determine source type from URL
  const sourceType = window.location.pathname.includes("bookmarks") ? "bookmark" : "like";

  updateOverlay("Waiting for tweets to load...", 5);
  await new Promise((r) => setTimeout(r, 2000));

  // Scroll and extract
  let noNewCount = 0;
  const maxNoNew = 6;
  const batchBuffer: ScrapedTweet[] = [];

  while (noNewCount < maxNoNew) {
    const beforeCount = seenIds.size;
    const articles = document.querySelectorAll('article[data-testid="tweet"], article[role="article"]');

    for (const article of articles) {
      const tweet = extractTweetFromArticle(article);
      if (tweet) {
        totalScraped++;
        batchBuffer.push(tweet);
      }
    }

    // Send batch when we have 50
    if (batchBuffer.length >= 50) {
      const batch = batchBuffer.splice(0, 50);
      const sent = await sendBatch(batch, sourceType, token, backendUrl);
      totalSent += sent;
    }

    updateOverlay(`${totalScraped} found, ${totalSent} sent`, Math.min(90, 5 + totalScraped / 10));

    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 600));

    if (seenIds.size === beforeCount) noNewCount++;
    else noNewCount = 0;
  }

  // Send remaining
  if (batchBuffer.length > 0) {
    const sent = await sendBatch(batchBuffer, sourceType, token, backendUrl);
    totalSent += sent;
  }

  updateOverlay(`Done! ${totalScraped} found, ${totalSent} sent to backend.`, 100);

  // Write final state so popup can read it
  await chrome.storage.local.set({
    readxlater_scraper: {
      status: `Done! ${totalScraped} found, ${totalSent} sent`,
      count: totalScraped,
      sent: totalSent,
      done: true,
      timestamp: Date.now(),
    },
  });

  // Remove overlay after 5 seconds
  setTimeout(removeOverlay, 5000);
}

main();
