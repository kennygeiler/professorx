# Category Label Thresholds + Live Search Trigger

## Finding

### Cognitive Load and Visible Category Labels

The core research foundation here is Miller's Law (George A. Miller, 1956, "The Magical Number Seven, Plus or Minus Two") and Hick's Law (William Edmund Hick, 1952). Miller's Law established that working memory holds approximately 7 ± 2 chunks of information at once — meaning beyond 9 visible options, users begin to struggle to hold the full set in mind. Hick's Law adds a logarithmic relationship: decision time increases with the number of options. Each doubling of options adds a roughly constant increment to decision time.

For filter/category interfaces specifically, Nielsen Norman Group research and practical UX convention converge on a tighter threshold: **5–7 visible labels** is the practical ceiling before users experience choice overload in a filter context. This is tighter than Miller's ceiling because filter labels require the user to simultaneously scan, evaluate relevance, and decide — a multi-step cognitive operation. Beyond 7 visible labels, users begin to skip-scan (ignore labels past the fold of their attention), which means labels 8+ become invisible in practice. The "paradox of choice" effect (Schwartz, 2004) further supports that more options do not improve outcomes past a threshold — they increase anxiety and reduce satisfaction.

For a personal tweet library tool like ProfessorX, categories are user-specific and will vary widely (some users may have 4 categories, others 30). The practical recommendation is: **show a maximum of 7 labels inline**, collapse the rest into a "+ N more" expandable control. If a user has 12 categories, show the 7 most-used and offer "5 more." This pattern is used by Spotify (genre filters), Notion (database filter chips), and Google Photos (album labels). The collapse threshold should be configurable or derived from usage frequency — show top-N by tweet count.

### Live Search Trigger Character Count

The tradeoff is between false-positive noise (short queries return too many irrelevant results) and responsiveness (users expect fast feedback). The established consensus across major apps:

- **Google Search**: triggers suggestions at 1 character, but applies relevance ranking to suppress noise
- **Slack search**: triggers at 1 character for channel/user lookup, 2 characters for message content
- **Spotify search**: triggers at 1 character for artist/track names (short dataset)
- **GitHub code search**: triggers at 3 characters
- **Amazon/e-commerce autocomplete** (Baymard Institute research): 3 characters is the most common trigger threshold; 2-character queries return excessive noise for large catalogs

The **3-character threshold** is the best practice for a text corpus search (tweet content) because:
1. 1–2 character queries produce mostly noise with natural language content
2. At 3 characters, the query starts to disambiguate meaningfully (e.g., "cat" vs "ca")
3. Debounce of 150–300ms should accompany the trigger to avoid firing on every keystroke mid-word
4. For proper nouns and usernames (shorter tokens), 2 characters may be acceptable as a secondary trigger

For ProfessorX specifically: tweet text search should trigger at 3 characters with a 200ms debounce. Author/handle search can trigger at 2 characters since handles are short tokens. Category filter search (if implemented as a search-within-filter) can trigger at 1 character since the dataset is small (user's own categories).

The balance between responsiveness and noise: the 3-character threshold eliminates most single-letter and two-letter noise words ("I", "a", "in", "to") which are stop words in most search implementations anyway. Starting at 3 characters also means the first result set is more likely to feel relevant, which builds user trust in the search feature.

## Recommendation

Show a maximum of 7 category labels inline on the filter bar; collapse anything beyond 7 into a "+ N more" expandable chip using frequency-sorted ordering (most-tweeted categories first). Trigger live tweet-text search at 3 characters with a 200ms debounce; trigger author/handle search at 2 characters.

## Key Facts

- Miller's Law: working memory holds 7 ± 2 items (1956, foundational cognitive science)
- Hick's Law: decision time increases logarithmically with number of choices (1952)
- Practical UX threshold for filter labels: 5–7 visible before collapse is needed
- Google: triggers autocomplete at 1 char (with heavy ranking to suppress noise)
- Slack message search: 2 character trigger
- GitHub code search: 3 character trigger
- Baymard Institute consensus for e-commerce autocomplete: 3 characters is most common
- Recommended debounce: 150–300ms (200ms is a safe default)
- Twitter/X search itself triggers at 1 character — but it has server-side ranking; ProfessorX does client-side filtering, so noise is more impactful
- For a personal library of 100–10,000 tweets, 3-char trigger with 200ms debounce produces near-instant perceived performance

## Sources

- Miller, G.A. (1956). "The Magical Number Seven, Plus or Minus Two." Psychological Review — foundational cognitive load research
- Hick, W.E. (1952). "On the rate of gain of information." Quarterly Journal of Experimental Psychology
- Schwartz, B. (2004). "The Paradox of Choice" — diminishing returns and anxiety from excessive options
- Nielsen Norman Group — filter/facet UX guidelines (general knowledge, training data)
- Baymard Institute — autocomplete and search UX research (general knowledge, training data)
- Spotify, Slack, GitHub, Google — observed behavior of live search triggers (general knowledge, training data)
- Note: Direct web fetching was blocked during this research session; findings are drawn from established UX research literature within training data (cutoff August 2025)

## Confidence

0.82 — Core findings (Miller's Law, Hick's Law, 3-character trigger, 7-label threshold) are well-established in UX literature with strong consensus across multiple independent sources. The specific app behaviors (Slack, GitHub, Spotify trigger counts) are from training knowledge rather than live verification, introducing some uncertainty on exact current implementation details.
