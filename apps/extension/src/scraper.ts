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
  const match = text.match(/([\d,.]+[KMB]?)/i);
  if (!match) return undefined;
  let num = match[1].replace(/,/g, "");
  if (num.endsWith("K") || num.endsWith("k")) return Math.round(parseFloat(num) * 1000);
  if (num.endsWith("M") || num.endsWith("m")) return Math.round(parseFloat(num) * 1_000_000);
  if (num.endsWith("B") || num.endsWith("b")) return Math.round(parseFloat(num) * 1_000_000_000);
  return parseInt(num, 10) || undefined;
}

function extractTweetFromArticle(article: Element): ScrapedTweet | null {
  try {
    // Tweet ID from status link
    const statusLink = article.querySelector('a[href*="/status/"]');
    if (!statusLink) return null;
    const href = statusLink.getAttribute("href") ?? "";
    const idMatch = href.match(/\/status\/(\d+)/);
    if (!idMatch) return null;
    const tweetId = idMatch[1];

    if (seenIds.has(tweetId)) return null;
    seenIds.add(tweetId);

    // Author info
    const userNameDiv = article.querySelector('div[data-testid="User-Name"]');
    let authorHandle = "unknown";
    let authorDisplayName = "Unknown";

    if (userNameDiv) {
      const spans = userNameDiv.querySelectorAll("span");
      for (const span of spans) {
        const text = span.textContent?.trim() ?? "";
        if (text.startsWith("@")) {
          authorHandle = text.slice(1);
        } else if (text && !text.startsWith("·") && text !== "·" && !text.match(/^\d+[smhd]$/) && authorDisplayName === "Unknown") {
          authorDisplayName = text;
        }
      }
    }

    // Avatar
    const avatarImg = article.querySelector('div[data-testid="Tweet-User-Avatar"] img');
    const authorAvatarUrl = avatarImg?.getAttribute("src") ?? null;

    // Tweet text
    const textDiv = article.querySelector('div[data-testid="tweetText"]');
    const textContent = textDiv?.textContent?.trim() ?? "";

    // Timestamp
    const timeEl = article.querySelector("time");
    const tweetCreatedAt = timeEl?.getAttribute("datetime") ?? null;

    // Media
    const media: ScrapedTweet["media"] = [];
    const photos = article.querySelectorAll('div[data-testid="tweetPhoto"] img');
    for (const img of photos) {
      const src = img.getAttribute("src");
      if (src && !src.includes("profile_images")) {
        media.push({ type: "photo", url: src });
      }
    }
    const videos = article.querySelectorAll("video");
    for (const vid of videos) {
      const src = vid.getAttribute("src") ?? vid.querySelector("source")?.getAttribute("src");
      const poster = vid.getAttribute("poster");
      if (src || poster) {
        media.push({
          type: "video",
          url: src ?? poster ?? "",
          preview_url: poster ?? undefined,
        });
      }
    }

    // Metrics from aria-labels
    const replyBtn = article.querySelector('button[data-testid="reply"]');
    const retweetBtn = article.querySelector('button[data-testid="retweet"]');
    const likeBtn = article.querySelector('button[data-testid="like"], button[data-testid="unlike"]');
    const viewsGroup = article.querySelector('a[href*="/analytics"]');

    const metrics: ScrapedTweet["metrics"] = {
      replies: parseMetricText(replyBtn?.getAttribute("aria-label") ?? null),
      retweets: parseMetricText(retweetBtn?.getAttribute("aria-label") ?? null),
      likes: parseMetricText(likeBtn?.getAttribute("aria-label") ?? null),
      views: parseMetricText(viewsGroup?.getAttribute("aria-label") ?? null),
    };

    // Tweet type
    let tweetType = "tweet";
    const socialContext = article.querySelector('span[data-testid="socialContext"]');
    if (socialContext?.textContent?.includes("Retweeted")) tweetType = "retweet";
    if (article.querySelector('div[data-testid="quotedTweet"]')) tweetType = "quote";

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
  } catch {
    return null;
  }
}

function extractAllTweets(): ScrapedTweet[] {
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  const tweets: ScrapedTweet[] = [];
  for (const article of articles) {
    const tweet = extractTweetFromArticle(article);
    if (tweet) tweets.push(tweet);
  }
  return tweets;
}

async function autoScroll(): Promise<void> {
  let noNewTweetsCount = 0;
  const maxNoNew = 5;
  const scrollDelay = 1500;

  // Send status to background
  const sendStatus = (msg: string) => {
    chrome.runtime.sendMessage({ type: "SCRAPE_STATUS", message: msg, count: totalScraped });
  };

  sendStatus("Starting scroll...");

  // Wait for initial tweets to load
  await new Promise((r) => setTimeout(r, 2000));

  while (noNewTweetsCount < maxNoNew) {
    const beforeCount = seenIds.size;

    // Extract tweets
    const newTweets = extractAllTweets();
    if (newTweets.length > 0) {
      totalScraped += newTweets.length;
      chrome.runtime.sendMessage({
        type: "TWEETS_SCRAPED",
        tweets: newTweets,
      });
      sendStatus(`Found ${totalScraped} tweets...`);
    }

    // Scroll down
    window.scrollBy(0, 1500);
    await new Promise((r) => setTimeout(r, scrollDelay));

    // Check if we got new tweets
    if (seenIds.size === beforeCount) {
      noNewTweetsCount++;
      sendStatus(`Found ${totalScraped} tweets (waiting for more...)`);
    } else {
      noNewTweetsCount = 0;
    }
  }

  // Final extraction
  const finalTweets = extractAllTweets();
  if (finalTweets.length > 0) {
    totalScraped += finalTweets.length;
    chrome.runtime.sendMessage({ type: "TWEETS_SCRAPED", tweets: finalTweets });
  }

  sendStatus(`Done! ${totalScraped} tweets scraped.`);
  chrome.runtime.sendMessage({ type: "SCRAPE_COMPLETE", count: totalScraped });
}

// Start immediately when injected
autoScroll();
