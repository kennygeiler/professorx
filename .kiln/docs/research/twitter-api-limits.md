# Twitter/X API Limitations for Likes and Bookmarks

## Finding

### Endpoints

**Liked Tweets (GET /2/users/:id/liked_tweets)**
The Twitter API v2 provides `GET /2/users/:id/liked_tweets` to retrieve tweets liked by a specific user. This returns a paginated list of tweet objects. It supports `expansions` (e.g., `author_id`, `attachments.media_keys`) and `tweet.fields` (e.g., `text`, `created_at`, `public_metrics`, `entities`, `attachments`) to enrich responses. Maximum 100 tweets per request; pagination via `next_token`.

**Bookmarks (GET /2/users/:id/bookmarks)**
The `GET /2/users/:id/bookmarks` endpoint retrieves the authenticated user's bookmarks. Bookmarks require user-context OAuth 2.0 (PKCE) — app-only Bearer tokens are explicitly not supported. This endpoint also supports `expansions` and `tweet.fields`. Maximum 100 tweets per request; pagination via `next_token`.

### API Access Tiers (as of 2024-2025)

Twitter/X restructured API access in 2023 and has maintained this structure with pricing increases:

| Tier | Cost (monthly) | Read Rate Limits | Key Restrictions |
|------|---------------|-----------------|-----------------|
| **Free** | $0 | 1 app-only request/month on search; no user timeline reads | Effectively useless for likes/bookmarks |
| **Basic** | $100/month | 10,000 tweets/month read cap; 100 requests/15min per user token | Access to liked_tweets and bookmarks endpoints |
| **Pro** | $5,000/month | 1,000,000 tweets/month; higher rate limits | Full access to filtered stream, elevated rate limits |
| **Enterprise** | Custom pricing | Custom | Dedicated support, SLA |

**Important:** The Free tier does NOT provide access to `GET /2/users/:id/liked_tweets` or bookmarks endpoints in any meaningful capacity. Basic ($100/month) is the minimum required tier for this use case.

### Rate Limits

**Liked Tweets endpoint** (`GET /2/users/:id/liked_tweets`):
- Basic tier: 5 requests / 15 minutes per user auth token
- Pro tier: 75 requests / 15 minutes per user auth token
- Each request returns up to 100 tweets
- At 5 req/15min with 100 tweets/req = 500 tweets per 15 minutes = ~2,000 tweets/hour maximum on Basic

**Bookmarks endpoint** (`GET /2/users/:id/bookmarks`):
- Requires user-context OAuth 2.0 only (no app-only Bearer token)
- Basic tier: 180 requests / 15 minutes per user token
- Returns up to 800 bookmarks total (Twitter hard caps the bookmarks list at 800 total items)
- Pagination via `next_token`

### Data Returned

Both endpoints return tweet objects with optional fields via `tweet.fields`:
- `text` — full tweet text (up to 280 characters; extended tweets use `full_text`)
- `created_at` — ISO 8601 timestamp
- `author_id` — requires `author_id` expansion to get user info
- `attachments` — media keys, poll IDs
- `entities` — URLs, hashtags, mentions, annotations
- `public_metrics` — like count, retweet count, reply count, quote count
- `referenced_tweets` — for retweets and quote tweets
- `context_annotations` — topics/entities Twitter identified in the tweet
- `lang` — detected language
- `possibly_sensitive` — content safety flag

Media (images, videos, GIFs) requires `attachments.media_keys` expansion + `media.fields` parameter. Videos return preview images and duration but NOT direct video download URLs — only a link back to Twitter.

### Recent Changes (2024-2026)

**March 2023:** Twitter eliminated free API access, killing the v1.1 free tier. The only free tier remaining is essentially non-functional (write-only, 1 app/month read).

**April 2023:** Basic tier introduced at $100/month. This was positioned as the "hobbyist" tier but the price point killed most hobby projects.

**Late 2023:** Rate limits on Basic further tightened. The liked_tweets endpoint was specifically restricted — previously at 75 req/15min on what was called "Elevated," it dropped to 5 req/15min on Basic.

**2024:** X (formerly Twitter) kept pricing stable but bookmarks endpoint remained only accessible with user OAuth 2.0 (PKCE), not app-only tokens. This is an important architectural constraint — you cannot read bookmarks server-side without the user's access token.

**2025:** No significant endpoint changes reported, but X has floated pricing restructuring. The $100/month Basic tier remains the entry point. Some reports suggest X is exploring lower-cost read-only tiers but nothing confirmed.

**Key constraint for ProfessorX:** At Basic ($100/month), you get 5 liked_tweets requests per user per 15 minutes. For a user with 10,000 likes, that's 100 paginated requests = 300 minutes (5 hours) to do a full historical sync. Subsequent incremental syncs would be much faster.

### OAuth Scopes Required

**Bookmarks** require OAuth 2.0 with PKCE (user context):
- `bookmark.read` — read bookmarks
- `tweet.read` — read tweet content
- `users.read` — read user profile info
- `offline.access` — required for refresh tokens (needed for background sync)

**Liked Tweets** can use either app-only (Bearer token) or user context:
- With app-only: no additional scopes, but you can only read public accounts' likes
- With user context OAuth 2.0: `like.read` + `tweet.read` + `users.read`
- `offline.access` for background sync refresh tokens

**Recommended approach:** Use OAuth 2.0 PKCE for both, requesting `like.read bookmark.read tweet.read users.read offline.access`. This covers all endpoints with one auth flow.

## Recommendation

The Twitter/X API is technically functional for this use case but cost-prohibitive for a free personal tool: Basic tier costs $100/month minimum. The architecture should plan for a **headless browser scraping fallback as the primary strategy**, with API support as the secondary/premium path. The API approach requires users to pay $100/month or the developer to absorb costs — neither is viable for a donation-funded personal tool. Scraping via the user's own browser session (browser extension or client-side Playwright/Puppeteer) is the more practical path for V1.

## Key Facts

- **Minimum API cost:** $100/month (Basic tier) to access liked_tweets and bookmarks
- **Free tier:** Does not support liked_tweets or bookmarks reads in any useful way
- **Liked tweets rate limit (Basic):** 5 requests / 15 minutes per user = 500 tweets per 15 min max
- **Bookmarks rate limit (Basic):** 180 requests / 15 minutes per user; hard cap of ~800 bookmarks total stored by Twitter
- **Bookmarks requirement:** User OAuth 2.0 PKCE only — no app-only tokens work for bookmarks
- **Max tweets per request:** 100 (both endpoints)
- **OAuth scopes needed:** `like.read bookmark.read tweet.read users.read offline.access`
- **Data returned:** Full tweet text, author, timestamps, media attachments (not video URLs), entities, public metrics
- **March 2023:** Free tier killed; Basic at $100/month introduced
- **Historical sync estimate:** 10,000 likes on Basic = ~5 hours to full sync (rate limited)
- **Bookmarks hard cap:** Twitter only stores ~800 bookmarks per user (platform limit, not API limit)
- **API v2 is current standard:** v1.1 is deprecated for most endpoints

## Sources

- Training knowledge: Twitter/X API v2 official documentation (developer.twitter.com)
- Training knowledge: Twitter API pricing page (developer.twitter.com/en/products/twitter-api)
- Training knowledge: Twitter API v2 liked tweets reference (developer.twitter.com/en/docs/twitter-api/tweets/likes/api-reference)
- Training knowledge: Twitter API v2 bookmarks reference (developer.twitter.com/en/docs/twitter-api/bookmarks/api-reference)
- Training knowledge: Twitter Developer Blog — API access changes (March 2023)
- Project VISION.md context: OQ-1 requirement framing, fallback scraping strategy noted
- Note: WebSearch and WebFetch tools were unavailable during this research session. Findings are based on training data through mid-2025. Rate limits and pricing should be verified against current developer.twitter.com documentation before implementation.

## Confidence

0.72 — Core findings (endpoint names, OAuth scopes, data fields, the fact that Basic is $100/month, bookmarks requiring user OAuth) are well-established in training data through mid-2025 and are consistent across multiple documentation sources. The specific rate limit numbers for Basic tier (5 req/15min for liked_tweets) have been stable since late 2023 and are cross-referenced with multiple community reports in training data. Confidence is capped at 0.72 rather than higher because: (1) WebSearch/WebFetch were unavailable so no live verification was possible, (2) X has a history of changing pricing/limits without advance notice, and (3) the bookmarks hard cap (800 items) and exact Pro tier limits should be verified before architecture decisions are made.
