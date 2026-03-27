/**
 * Content script — runs on every x.com page.
 * Only activates if readxlater_sync flag is set in chrome.storage.
 * Extracts tweets, sends directly to backend, shows overlay.
 */

interface ScrapedTweet {
  twitter_tweet_id: string;
  author_handle: string;
  author_display_name: string;
  author_avatar_url: string | null;
  text_content: string;
  media: Array<{ type: string; url: string; preview_url?: string }>;
  metrics: Record<string, number | undefined>;
  tweet_type: string;
  tweet_created_at: string | null;
}

(async () => {
  // Check if we should run
  const data = await chrome.storage.local.get("readxlater_sync");
  if (!data.readxlater_sync) return; // Not activated — do nothing

  // Clear the flag so we don't run again on page refresh
  const syncConfig = data.readxlater_sync;
  await chrome.storage.local.remove("readxlater_sync");

  // Get auth config
  const config = await chrome.storage.local.get(["readxlater_auth_token", "readxlater_backend_url"]);
  const token = config.readxlater_auth_token;
  const backendUrl = config.readxlater_backend_url || "http://localhost:3000";

  if (!token) {
    console.log("[readXlater] No API key set");
    return;
  }

  const sourceType = window.location.pathname.includes("bookmark") ? "bookmark" : "like";

  // --- Overlay ---
  const overlay = document.createElement("div");
  overlay.id = "readxlater-overlay";
  overlay.style.cssText = `
    position:fixed;bottom:20px;right:20px;z-index:999999;
    background:#09090b;border:1px solid #27272a;border-radius:12px;
    padding:14px 18px;min-width:240px;font-family:system-ui,sans-serif;
    box-shadow:0 4px 24px rgba(0,0,0,0.5);
  `;
  overlay.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:#e4e4e7;margin-bottom:8px">readXlater</div>
    <div id="rxl-status" style="font-size:11px;color:#1d9bf0">Loading...</div>
    <div style="margin-top:8px;height:3px;background:#27272a;border-radius:99px;overflow:hidden">
      <div id="rxl-bar" style="height:100%;background:#1d9bf0;width:0%;transition:width 0.3s;border-radius:99px"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const setStatus = (s: string) => { const el = document.getElementById("rxl-status"); if (el) el.textContent = s; };
  const setBar = (p: number) => { const el = document.getElementById("rxl-bar"); if (el) el.style.width = `${p}%`; };

  setStatus("Waiting for tweets to load...");
  setBar(5);
  await new Promise(r => setTimeout(r, 2500));

  // --- Extraction ---
  const seenIds = new Set<string>();
  let totalScraped = 0;
  let totalSent = 0;

  function parseMetric(text: string | null): number | undefined {
    if (!text) return undefined;
    const m = text.match(/([\d,.]+)\s*([KMB])?/i);
    if (!m) return undefined;
    let n = parseFloat(m[1].replace(/,/g, ""));
    if (m[2]?.toUpperCase() === "K") n *= 1000;
    if (m[2]?.toUpperCase() === "M") n *= 1e6;
    return Math.round(n) || undefined;
  }

  function extract(article: Element): ScrapedTweet | null {
    try {
      let tweetId: string | null = null;
      for (const a of article.querySelectorAll("a[href]")) {
        const m = (a.getAttribute("href") ?? "").match(/\/status\/(\d+)/);
        if (m) { tweetId = m[1]; break; }
      }
      if (!tweetId || seenIds.has(tweetId)) return null;
      seenIds.add(tweetId);

      let handle = "unknown", name = "Unknown";
      for (const a of article.querySelectorAll("a[href]")) {
        const h = a.getAttribute("href") ?? "";
        if (h.match(/^\/[A-Za-z0-9_]{1,15}$/) && !h.includes("/status/")) {
          handle = h.slice(1);
          const s = a.querySelector("span");
          if (s?.textContent) name = s.textContent.trim();
          break;
        }
      }

      const avatar = article.querySelector('img[src*="profile_images"]')?.getAttribute("src") ?? null;
      const textEl = article.querySelector('div[data-testid="tweetText"]') || article.querySelector("div[lang]");
      const timeEl = article.querySelector("time");

      const media: ScrapedTweet["media"] = [];
      for (const img of article.querySelectorAll("img")) {
        const s = img.getAttribute("src") ?? "";
        if (s.includes("pbs.twimg.com/media")) media.push({ type: "photo", url: s });
      }

      const metrics: Record<string, number | undefined> = {};
      for (const btn of article.querySelectorAll("[role=button],button")) {
        const l = btn.getAttribute("aria-label")?.toLowerCase() ?? "";
        if (l.includes("repl")) metrics.replies = parseMetric(l);
        else if (l.includes("repost")) metrics.retweets = parseMetric(l);
        else if (l.includes("like")) metrics.likes = parseMetric(l);
      }

      return {
        twitter_tweet_id: tweetId, author_handle: handle, author_display_name: name,
        author_avatar_url: avatar, text_content: textEl?.textContent?.trim() ?? "",
        media, metrics, tweet_type: "tweet", tweet_created_at: timeEl?.getAttribute("datetime") ?? null,
      };
    } catch { return null; }
  }

  async function sendBatch(tweets: ScrapedTweet[]): Promise<number> {
    try {
      const res = await fetch(`${backendUrl}/api/tweets/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tweets: tweets.map(t => ({
            ...t,
            author_avatar_url: t.author_avatar_url?.startsWith("http") ? t.author_avatar_url : null,
            media: t.media.filter(m => m.url.startsWith("http")),
            source_type: sourceType,
          })),
        }),
      });
      if (res.ok) { const d = await res.json(); return d.total ?? d.inserted ?? 0; }
    } catch {}
    return 0;
  }

  // --- Scroll loop ---
  let noNew = 0;
  const buffer: ScrapedTweet[] = [];

  while (noNew < 6) {
    const before = seenIds.size;
    for (const el of document.querySelectorAll('article[data-testid="tweet"],article[role="article"]')) {
      const t = extract(el);
      if (t) { totalScraped++; buffer.push(t); }
    }

    if (buffer.length >= 50) {
      const batch = buffer.splice(0, 50);
      totalSent += await sendBatch(batch);
    }

    setStatus(`${totalScraped} found, ${totalSent} sent`);
    setBar(Math.min(90, 5 + totalScraped / 10));

    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 600));
    if (seenIds.size === before) noNew++; else noNew = 0;
  }

  if (buffer.length > 0) totalSent += await sendBatch(buffer);

  setStatus(`Done! ${totalScraped} found, ${totalSent} sent. Redirecting...`);
  setBar(100);

  await chrome.storage.local.set({
    readxlater_scraper: { status: `Done! ${totalScraped} found, ${totalSent} sent`, count: totalScraped, sent: totalSent, done: true, timestamp: Date.now() },
    readxlater_flash: { message: `Synced ${totalSent} tweets`, timestamp: Date.now() },
  });

  // Redirect to library after 2 seconds with flash message in URL
  setTimeout(() => {
    window.location.href = `${backendUrl}?synced=${totalSent}`;
  }, 2000);
})();
