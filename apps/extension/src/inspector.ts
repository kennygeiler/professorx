/**
 * Inspector — validates CSS selectors against the live Twitter DOM.
 * Injected into a twitter.com page to check if selectors still work.
 * Also captures DOM structure for AI-powered healing when selectors break.
 */

// Selectors are passed via message from background worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "INSPECT_SELECTORS") {
    const selectors = message.selectors as Record<string, string>;
    const results: Record<string, { found: number; sample?: string }> = {};

    for (const [name, selector] of Object.entries(selectors)) {
      try {
        const elements = document.querySelectorAll(selector);
        results[name] = {
          found: elements.length,
          sample: elements[0]?.outerHTML?.slice(0, 200),
        };
      } catch {
        results[name] = { found: 0 };
      }
    }

    // Also capture a DOM snippet of the first tweet-like structure for AI healing
    let domSnapshot = "";
    const firstArticle = document.querySelector("article");
    if (firstArticle) {
      domSnapshot = firstArticle.outerHTML.slice(0, 3000);
    }

    sendResponse({ results, domSnapshot });
    return true;
  }
});

// Signal that inspector is ready
chrome.runtime.sendMessage({ type: "INSPECTOR_READY" });
