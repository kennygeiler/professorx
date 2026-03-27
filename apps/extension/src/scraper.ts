/**
 * DOM scraper — extracts tweets from twitter.com by auto-scrolling and reading the DOM.
 * Selectors are configurable and can be updated by the AI auto-heal system.
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

// Default selectors — overridden by config from background worker
let SEL = {
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
};

const seenIds = new Set<string>();
let totalScraped = 0;

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
      const href = link.getAttribute("href") ?? "";
      const match = href.match(/\/status\/(\d+)/);
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

    const avatarImg = article.querySelector(SEL.avatar);
    const authorAvatarUrl = avatarImg?.getAttribute("src") ?? null;

    let textContent = "";
    const textDiv = article.querySelector(SEL.tweetText);
    if (textDiv) {
      textContent = textDiv.textContent?.trim() ?? "";
    } else {
      const langDiv = article.querySelector(SEL.tweetTextFallback);
      if (langDiv) textContent = langDiv.textContent?.trim() ?? "";
    }

    const timeEl = article.querySelector(SEL.time);
    const tweetCreatedAt = timeEl?.getAttribute("datetime") ?? null;

    const media: ScrapedTweet["media"] = [];
    const allImgs = article.querySelectorAll("img");
    for (const img of allImgs) {
      const src = img.getAttribute("src") ?? "";
      if (src.includes("pbs.twimg.com/media")) {
        media.push({ type: "photo", url: src });
      }
    }
    const videos = article.querySelectorAll(SEL.video);
    for (const vid of videos) {
      const src = vid.getAttribute("src") ?? (vid.querySelector("source") as HTMLSourceElement)?.getAttribute("src") ?? "";
      const poster = vid.getAttribute("poster") ?? "";
      if (src || poster) {
        media.push({ type: "video", url: src || poster, preview_url: poster || undefined });
      }
    }

    const metrics: ScrapedTweet["metrics"] = {};
    const buttons = article.querySelectorAll('[role="button"], button');
    for (const btn of buttons) {
      const label = btn.getAttribute("aria-label")?.toLowerCase() ?? "";
      if (label.includes("repl")) metrics.replies = parseMetricText(label);
      else if (label.includes("repost") || label.includes("retweet")) metrics.retweets = parseMetricText(label);
      else if (label.includes("like")) metrics.likes = parseMetricText(label);
      else if (label.includes("view")) metrics.views = parseMetricText(label);
    }

    let tweetType = "tweet";
    const articleText = article.textContent?.toLowerCase() ?? "";
    if (articleText.includes("retweeted")) tweetType = "retweet";
    if (article.querySelector('div[role="link"]')?.textContent?.includes("@")) tweetType = "quote";

    return {
      twitter_tweet_id: tweetId, author_handle: authorHandle,
      author_display_name: authorDisplayName, author_avatar_url: authorAvatarUrl,
      text_content: textContent, media, metrics, tweet_type: tweetType,
      tweet_created_at: tweetCreatedAt,
    };
  } catch { return null; }
}

function extractAllTweets(): ScrapedTweet[] {
  const articles = document.querySelectorAll(SEL.tweetArticle);
  const tweets: ScrapedTweet[] = [];
  for (const article of articles) {
    const tweet = extractTweetFromArticle(article);
    if (tweet) tweets.push(tweet);
  }
  return tweets;
}

async function autoScroll(): Promise<void> {
  let noNewTweetsCount = 0;
  const maxNoNew = 6;
  const scrollDelay = 600;

  const sendMsg = (type: string, data: Record<string, unknown> = {}) => {
    try { chrome.runtime.sendMessage({ type, ...data }); } catch {}
  };

  // Listen for selector config from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SET_SELECTORS" && msg.selectors) {
      SEL = { ...SEL, ...msg.selectors };
    }
  });

  // Request selectors from background
  sendMsg("GET_SELECTORS");
  await new Promise((r) => setTimeout(r, 2000));

  while (noNewTweetsCount < maxNoNew) {
    const beforeCount = seenIds.size;
    const newTweets = extractAllTweets();
    if (newTweets.length > 0) {
      totalScraped += newTweets.length;
      sendMsg("TWEETS_SCRAPED", { tweets: newTweets });
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, scrollDelay));
    if (seenIds.size === beforeCount) { noNewTweetsCount++; } else { noNewTweetsCount = 0; }
    sendMsg("SCRAPE_STATUS", { message: `Found ${totalScraped} tweets...`, count: totalScraped });
  }

  const finalTweets = extractAllTweets();
  if (finalTweets.length > 0) {
    totalScraped += finalTweets.length;
    sendMsg("TWEETS_SCRAPED", { tweets: finalTweets });
  }
  sendMsg("SCRAPE_STATUS", { message: `Done! ${totalScraped} tweets scraped.`, count: totalScraped });
  sendMsg("SCRAPE_COMPLETE", { count: totalScraped });
}

autoScroll();
