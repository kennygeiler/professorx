# VISION.md — ProfessorX

**Elevator Pitch:** ProfessorX is a personal tool that turns your chaotic Twitter likes and bookmarks into an organized, searchable library. AI categorizes everything automatically — and learns your preferences over time. Mobile-first, fast, and built by one person for real use.

**Maker:** Kenny Geiler — unemployed PM and independent filmmaker. outsidekenny.com

---

## 1. Target Users

**Primary:** People who use Twitter likes/bookmarks as a "save for later" system and can never find anything again. Power users who like 10-50+ tweets per day across topics.

**Secondary:** Content creators, researchers, and curators who want to organize saved tweets by theme, format, or topic.

**Job to be done:** "I liked a tweet about X three weeks ago and I cannot find it. I want to search my likes the way I search my email."

---

## 2. Core Features (V1 Scope)

### Authentication & Data Ingestion
- Twitter OAuth for account connection
- Fallback: AI remote agent via headless browser on user's device if API is restrictive (client-side scraping)
- Background job system to process likes/bookmarks incrementally
- All savable tweet types supported (likes, bookmarks, etc.) — toggleable in settings

### AI Categorization
- Automatic categorization on ingestion — zero manual work required
- Per-user AI categorization memory file (personalized learning over time)
- AI learns from reclassifications: when user re-categorizes, AI prompts "why?" to improve
- "Skip" and "Skip always" options for the explanation prompt (respects user's time)
- User can suggest new categories, delete categories, merge categories
- Dynamic category/tag labels up to a researched threshold

### Search & Discovery
- Live search starting at the 3rd or 4th character typed (research needed on exact threshold)
- Search across tweet text, author, categories, and tags
- Time filter: dynamic labels (Today, This Week, This Month, etc.) plus a Fibonacci-style time slider for deeper historical browsing
- Filter by category, format, author, media type

### Tweet Display
- Tweet cards in Twitter-native design (familiar, not jarring)
- Preserves media, quote tweets, thread context where possible
- Read-only in v1 — no Twitter actions (no liking, retweeting, replying from ProfessorX)

### About & Support
- Collapsible footer combining "About" and "Donation" into one element
- Audio maker message: Kenny introduces himself with personality — the chopped cheese and ginger shot guy from New York, not a tech bro, just a dude who builds things
- Donation-based support (not a paywall)

---

## 3. Future Iterations (Post-V1)

- **Algorithm management:** Tools to influence what Twitter shows you
- **AI actions on Twitter:** Liking, bookmarking, replying via ProfessorX (requires careful UX)
- **Sharing:** Share curated collections or categories with others
- **Multi-platform:** Extend beyond Twitter to other platforms with savable content
- **Collaborative categorization:** Friends can suggest tags on shared collections
- **Export:** Download organized collections as structured data
- **Browser extension:** Quick-save from Twitter timeline directly into ProfessorX

---

## 4. Design Principles

1. **Mobile-first** — designed for phone use, desktop is a bonus
2. **Muted UI** — no visual noise, let the tweets be the content. Calm palette, generous whitespace
3. **Speed** — search results feel instant. No loading spinners for common actions
4. **Simplicity** — one screen does the job. Filters and settings are progressive disclosure
5. **Twitter-native feel** — tweet cards look like Twitter. Don't fight muscle memory
6. **Respect the user's time** — skip options on every prompt, smart defaults, no onboarding tutorial

---

## 5. Business Model

- **Free to use.** No subscription, no paywall, no ads.
- **Donation-based:** A friendly, non-pushy donation option in the collapsible footer
- **About the maker:** This is a personal project by Kenny Geiler. The about section is authentic — audio message, personality, a real human behind the tool
- **Friends-first launch:** Initial rollout to friends and close network before any public launch

---

## 6. Technical Constraints & Open Questions for Research

### Constraints
- Single developer (Kenny) — architecture must be simple enough for one person to maintain
- Must work on mobile Safari and Chrome as primary targets
- Twitter API rate limits and restrictions are a hard reality — fallback scraping strategy required
- Per-user data storage needed for categorization memory files

### Open Questions (for MI6 research)

**OQ-1**: What are the current Twitter/X API limitations for reading likes and bookmarks? What endpoints exist, what are rate limits, and what's the cost? | Priority: high | Timing: before-build | Context: This determines whether we lead with API or headless browser. The entire data ingestion strategy depends on this.

**OQ-2**: What is the best approach for client-side headless browser scraping of Twitter? Puppeteer vs Playwright vs browser extension vs other? | Priority: high | Timing: before-build | Context: Fallback strategy if API is too restrictive. Must run on user's device, not a server.

**OQ-3**: What is the optimal number of dynamic category/tag labels before UX degrades? What does research say about cognitive load for filter interfaces? | Priority: medium | Timing: before-build | Context: Determines the threshold for dynamic labels and when to collapse into "more" or slider UI.

**OQ-4**: What is the ideal character count to trigger live search (3rd vs 4th character)? What do major apps do? | Priority: medium | Timing: before-build | Context: Balance between responsiveness and noise in search results.

**OQ-5**: What is the best tech stack for a mobile-first, single-developer web app with AI categorization? (Next.js vs SvelteKit vs other, hosting, AI API costs) | Priority: high | Timing: before-build | Context: Kenny is one person. Stack must be productive, cheap to host, and support AI integration.

**OQ-6**: How should per-user AI categorization memory be structured? What format enables fast learning from reclassifications? | Priority: medium | Timing: before-build | Context: Each user gets a personalized memory file. Needs to be lightweight but effective for improving categorization accuracy.

**OQ-7**: What is the Fibonacci time slider UX pattern? Are there existing implementations or research on non-linear time navigation? | Priority: low | Timing: during-build | Context: Novel UI element for browsing deeper into tweet history. Needs reference implementations.

**OQ-8**: What are the legal/TOS implications of scraping Twitter via headless browser? | Priority: high | Timing: before-build | Context: Need to understand risk before building the fallback scraping system. User is accessing their own data, but TOS may still apply.

---

## 7. Non-Goals / Out of Scope for V1

- **No Twitter actions** — ProfessorX is read-only in v1. No liking, retweeting, replying, or posting.
- **No algorithm management** — future iteration. V1 is purely about organizing what you've already saved.
- **No multi-platform support** — Twitter/X only for v1.
- **No sharing or social features** — personal tool first.
- **No desktop-optimized layout** — mobile-first. Desktop works but isn't the design target.
- **No monetization beyond donations** — no premium tier, no ads, no data selling.
- **No onboarding tutorial or walkthrough** — the UI should be self-evident.

---

## 8. Key Decisions

| Decision | Alternatives Considered | Rationale |
|----------|------------------------|-----------|
| Read-only in v1 | Allow AI actions on Twitter | Reduces scope, avoids risky Twitter account actions, ships faster |
| Per-user memory file for AI | Shared model across users | Personalization is the core value prop — each user's categorization should reflect their mental model |
| Collapsible footer for about + donation | Separate about page, modal | Keeps the main UI clean, combines two low-priority elements |
| Audio maker message | Text-only about section | Authenticity and personality — Kenny's voice is the brand |
| Friends-first launch | Public launch | Low-risk validation, real feedback from trusted users |
| Donation-based, not freemium | Subscription, ads | Aligns with maker ethos — this is a personal project, not a startup |
| Fibonacci time slider | Standard date picker, preset ranges | More intuitive for "I want to go way back" exploration without precise date knowledge |

---

## 9. Elicitation Log

| Method | Key Output |
|--------|------------|
| Problem framing | Twitter likes/bookmarks are unsearchable chaos — core pain point identified |
| User journey mapping | Save tweet -> forget -> need it -> can't find it -> frustration |
| Stress testing (3 challenges) | Validated API fallback strategy, per-user AI learning, and dynamic time filtering |
| "Yes, and..." building | Expanded from basic search to AI categorization with learning, fibonacci slider, audio about section |
| Domain pivots | Covered UX, technical, business model, personalization, edge cases, visual design |

---

## 10. Visual Direction

No detailed visual direction specified beyond design principles. Key aesthetic intent:

- **Mood:** Calm, muted, utilitarian. Not flashy. Think "good tool" not "cool app."
- **Twitter-native tweet cards:** Familiar card format so users don't have to relearn how to read a tweet
- **Mobile-first spatial philosophy:** Vertical scrolling, thumb-reachable controls, minimal horizontal navigation
- **What to avoid:** Bright colors competing with tweet content, complex navigation, anything that feels like a "social media dashboard"

Build will proceed with sensible defaults based on these principles. Design system generation can be informed by the muted/calm/utilitarian direction above.
