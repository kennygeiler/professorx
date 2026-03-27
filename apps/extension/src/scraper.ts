/**
 * DOM scraper — extracts tweets from twitter.com by auto-scrolling and reading the DOM.
 * Injected programmatically by the background worker into twitter.com/likes or /i/bookmarks.
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
    // Tweet ID — find any link containing /status/
    const allLinks = article.querySelectorAll("a[href]");
    let tweetId: string | null = null;
    for (const link of allLinks) {
      const href = link.getAttribute("href") ?? "";
      const match = href.match(/\/status\/(\d+)/);
      if (match) {
        tweetId = match[1];
        break;
      }
    }
    if (!tweetId) return null;
    if (seenIds.has(tweetId)) return null;
    seenIds.add(tweetId);

    // Author — look for links to user profiles
    let authorHandle = "unknown";
    let authorDisplayName = "Unknown";
    for (const link of allLinks) {
      const href = link.getAttribute("href") ?? "";
      // Match /{username} but not /status/, /i/, /hashtag/, etc
      if (href.match(/^\/[A-Za-z0-9_]{1,15}$/) && !href.includes("/status/")) {
        authorHandle = href.slice(1);
        // The display name is usually in a nearby span
        const nameSpan = link.querySelector("span");
        if (nameSpan?.textContent) {
          authorDisplayName = nameSpan.textContent.trim();
        }
        break;
      }
    }

    // Avatar
    const avatarImg = article.querySelector('img[src*="profile_images"]');
    const authorAvatarUrl = avatarImg?.getAttribute("src") ?? null;

    // Tweet text — try data-testid first, fall back to any div with lang attribute
    let textContent = "";
    const textDiv = article.querySelector('div[data-testid="tweetText"]');
    if (textDiv) {
      textContent = textDiv.textContent?.trim() ?? "";
    } else {
      const langDiv = article.querySelector('div[lang]');
      if (langDiv) textContent = langDiv.textContent?.trim() ?? "";
    }

    // Timestamp
    const timeEl = article.querySelector("time");
    const tweetCreatedAt = timeEl?.getAttribute("datetime") ?? null;

    // Media
    const media: ScrapedTweet["media"] = [];
    const allImgs = article.querySelectorAll("img");
    for (const img of allImgs) {
      const src = img.getAttribute("src") ?? "";
      // Twitter media images contain pbs.twimg.com/media
      if (src.includes("pbs.twimg.com/media")) {
        media.push({ type: "photo", url: src });
      }
    }
    const videos = article.querySelectorAll("video");
    for (const vid of videos) {
      const src = vid.getAttribute("src") ?? vid.querySelector("source")?.getAttribute("src") ?? "";
      const poster = vid.getAttribute("poster") ?? "";
      if (src || poster) {
        media.push({ type: "video", url: src || poster, preview_url: poster || undefined });
      }
    }

    // Metrics — parse from aria-labels on buttons
    const metrics: ScrapedTweet["metrics"] = {};
    const buttons = article.querySelectorAll('[role="button"], button');
    for (const btn of buttons) {
      const label = btn.getAttribute("aria-label")?.toLowerCase() ?? "";
      if (label.includes("repl")) metrics.replies = parseMetricText(label);
      else if (label.includes("repost") || label.includes("retweet")) metrics.retweets = parseMetricText(label);
      else if (label.includes("like")) metrics.likes = parseMetricText(label);
      else if (label.includes("view")) metrics.views = parseMetricText(label);
    }

    // Tweet type
    let tweetType = "tweet";
    const articleText = article.textContent?.toLowerCase() ?? "";
    if (articleText.includes("retweeted")) tweetType = "retweet";
    if (article.querySelector('div[role="link"]')?.textContent?.includes("@")) {
      // Embedded quote tweet
      tweetType = "quote";
    }

    return {
      twitter_tweet_id: tweetId,
      author_handle: authorHandle,
      author_display_name: authorDisplayName,
      author_avatar_url: authorAvatarUrl,
      text_content: textContent,
      media,
      metrics,
      tweet_type: tweetType,
      tweet_created_at: tweetCreatedAt,
    };
  } catch (e) {
    console.warn("[Scraper] Failed to extract tweet:", e);
    return null;
  }
}

function extractAllTweets(): ScrapedTweet[] {
  // Try multiple selectors for tweet containers
  const articles = document.querySelectorAll('article[data-testid="tweet"], article[role="article"]');
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
  const scrollDelay = 600; // Fast scroll — Twitter loads quickly

  const sendMsg = (type: string, data: Record<string, unknown> = {}) => {
    try {
      chrome.runtime.sendMessage({ type, ...data });
    } catch (e) {
      console.warn("[Scraper] sendMessage failed:", e);
    }
  };

  console.log("[Scraper] Waiting for page to load...");
  sendMsg("SCRAPE_STATUS", { message: "Waiting for page to load...", count: 0 });

  // Wait for initial content
  await new Promise((r) => setTimeout(r, 2000));

  console.log("[Scraper] Starting auto-scroll");

  while (noNewTweetsCount < maxNoNew) {
    const beforeCount = seenIds.size;

    // Extract tweets
    const newTweets = extractAllTweets();
    if (newTweets.length > 0) {
      totalScraped += newTweets.length;
      console.log(`[Scraper] +${newTweets.length} tweets (total: ${totalScraped})`);
      sendMsg("TWEETS_SCRAPED", { tweets: newTweets });
    }

    // Scroll
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, scrollDelay));

    // Check progress
    if (seenIds.size === beforeCount) {
      noNewTweetsCount++;
      console.log(`[Scraper] No new tweets (${noNewTweetsCount}/${maxNoNew})`);
    } else {
      noNewTweetsCount = 0;
    }

    sendMsg("SCRAPE_STATUS", { message: `Found ${totalScraped} tweets...`, count: totalScraped });
  }

  // Final extraction
  const finalTweets = extractAllTweets();
  if (finalTweets.length > 0) {
    totalScraped += finalTweets.length;
    sendMsg("TWEETS_SCRAPED", { tweets: finalTweets });
  }

  console.log(`[Scraper] Complete! ${totalScraped} total tweets`);
  sendMsg("SCRAPE_STATUS", { message: `Done! ${totalScraped} tweets scraped.`, count: totalScraped });
  sendMsg("SCRAPE_COMPLETE", { count: totalScraped });
}

// Start immediately
autoScroll();
