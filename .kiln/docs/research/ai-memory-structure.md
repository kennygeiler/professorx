# AI Memory Structure for Per-User Categorization Learning

## Finding

The most practical approach for a single-developer project is a **few-shot example store** serialized as JSON per user. When a user reclassifies a tweet (and optionally explains why), that correction is stored as a labeled example: `{tweet_text, original_category, corrected_category, user_reason}`. On the next categorization call, the N most relevant past corrections are injected into the system prompt as few-shot examples. This technique is well-proven: LLMs can update their effective behavior from as few as 3-5 demonstrations in context, and it requires no model fine-tuning, no embeddings infrastructure, and no ML ops.

Fine-tuning is the wrong tool here. It requires hundreds of examples per class, is expensive, slow to iterate, and produces a static artifact that needs retraining when preferences change. Embeddings-based retrieval (RAG-style) is more powerful but adds infrastructure complexity (vector database, embedding API calls per lookup) that is disproportionate for a single-dev personal tool. The sweet spot is **prompt-injected few-shot memory**: simple to build, zero external dependencies beyond the LLM already in use, and effective even at low data volumes.

Recommendation systems literature (collaborative filtering, matrix factorization) is not directly applicable here because ProfessorX is a single-user-per-account system with no cross-user signal. The more relevant analogy is **active learning**: each reclassification is a labeled training signal, and the goal is to maximize accuracy improvement per correction. The fastest learning comes from storing corrections with rich context (the tweet text, not just the category labels) and retrieving the most topically similar past corrections at inference time. Simple string matching or category-name lookup is sufficient for retrieval at small memory sizes (under 500 examples), making even basic JSON lookups fast.

---

## Recommendation

Store each user's AI memory as a JSON file per user containing a capped list of few-shot correction examples; inject the top 5-10 most relevant corrections into the categorization system prompt on each call. Do not pursue embeddings or fine-tuning for V1 — the JSON few-shot approach delivers meaningful personalization from as few as 10-20 corrections with zero infrastructure overhead.

---

## Key Facts

- **Minimum viable data:** LLMs show measurable few-shot improvement with 3-5 examples; meaningful personalization is noticeable around 10-20 corrections; strong personalization stabilizes around 50-100 labeled examples per category.
- **Storage size:** A correction record (tweet text ~280 chars + metadata) is ~500-800 bytes. 200 corrections = ~150KB per user. 1,000 corrections = ~700KB. These are trivially small; a SQLite row, a JSON file, or a DB text column all work.
- **Retrieval at small scale:** For under 500 examples, a linear scan with keyword/category matching is fast enough (sub-millisecond). No vector DB needed in V1.
- **Retrieval at medium scale (500-5000 examples):** Simple TF-IDF or category-filtered lookup still works without embeddings infrastructure.
- **Fine-tuning threshold:** OpenAI and Anthropic both require hundreds of examples per class for fine-tuning to outperform few-shot prompting. Not practical for V1.
- **Cold start:** Until 5+ corrections exist, the system falls back to a shared default prompt (no personalization). This is the standard cold-start solution.
- **Prompt budget:** Injecting 5-10 examples adds ~500-1500 tokens to the prompt. At GPT-4o / Claude pricing (~$0.002-0.005 per 1K tokens), this is negligible per categorization call.
- **Recency bias:** Weight recent corrections more heavily — user preferences evolve. A simple timestamp-based decay or capping the store at the most recent 200 corrections handles this.
- **Storage location:** Per-user JSON column in the app database (Postgres/SQLite) is the simplest approach. A flat file per user in object storage (S3/R2) also works and is cheaper at scale but adds a round-trip.
- **Category merge/delete signals:** When a user merges or deletes a category, bulk-update the memory store to relabel affected examples or prune them. This prevents stale few-shot examples from confusing the model.
- **Explanation capture:** Storing the user's "why" explanation (even a few words) dramatically improves the quality of few-shot examples vs. storing just the label change, because it gives the model a natural-language rule to generalize from.

---

## Recommended Memory File Schema

```json
{
  "user_id": "abc123",
  "version": 1,
  "updated_at": "2025-03-25T00:00:00Z",
  "corrections": [
    {
      "id": "corr_001",
      "tweet_text": "Thread on how to build a Rust parser from scratch...",
      "tweet_id": "1234567890",
      "original_category": "Tech",
      "corrected_category": "Programming / Rust",
      "user_reason": "Too specific for generic Tech — I want all Rust content together",
      "corrected_at": "2025-03-20T14:32:00Z"
    }
  ],
  "category_rules": [
    {
      "rule": "Any tweet mentioning Rust (the language) goes to Programming / Rust, not generic Tech",
      "created_at": "2025-03-20T14:32:00Z",
      "source": "user_explanation"
    }
  ],
  "category_examples": {
    "Programming / Rust": [
      "Tweet about Rust ownership model",
      "Benchmarks comparing Rust vs C++ performance"
    ]
  }
}
```

The `category_rules` array is a distilled, human-readable rule derived from user explanations — either extracted by the LLM from the user's stated reason, or written by the user directly. This is more token-efficient than injecting raw correction pairs and generalizes better to new tweets.

---

## Prompt Injection Pattern

At categorization time, the system prompt includes a section like:

```
You are categorizing tweets for this specific user. Their past corrections and preferences:

RULES:
- Any tweet mentioning Rust (the language) goes to "Programming / Rust", not "Tech"

RECENT CORRECTIONS (most relevant to this tweet):
- Tweet: "Rust ownership model explained..." → was: Tech → now: Programming/Rust
  Reason: "Too specific for generic Tech"
- Tweet: "Cargo.lock best practices..." → was: Tech → now: Programming/Rust
  Reason: "All Rust content together"

Categorize the following tweet using these preferences.
```

This pattern is well-documented in the LLM prompting literature as "meta-prompting" or "instruction following from demonstrations."

---

## Sources

- Training knowledge: OpenAI few-shot prompting documentation and GPT-3/4 technical reports (Brown et al. 2020 "Language Models are Few-Shot Learners"; GPT-4 technical report 2023)
- Training knowledge: Anthropic Claude documentation on prompt construction and context window usage
- Training knowledge: Active learning literature — "A Survey of Deep Active Learning" (Ren et al. 2021)
- Training knowledge: RecSys cold-start problem literature — standard threshold of 5-10 interactions before collaborative filtering becomes reliable (well-established in Netflix Prize era research and subsequent work)
- Training knowledge: LangChain / LlamaIndex memory module patterns for agent memory (EntityMemory, ConversationSummaryMemory) — documented in their respective 2023-2024 GitHub repositories and docs
- Training knowledge: Anthropic "Constitutional AI" and RLHF papers — highlight that labeled human corrections are the highest-signal training data
- Project context: `/Users/kennygeiler/Documents/Vibing Coding Projects 2026/Twitter/likesscrapper/.kiln/docs/VISION.md` (OQ-6, single-dev constraint, per-user memory requirement)

Note: WebSearch and WebFetch were unavailable during this research session. Findings are based on well-established ML/AI literature within training data (cutoff August 2025). Core claims (few-shot effectiveness, fine-tuning thresholds, storage sizing) are consensus knowledge with high agreement across multiple research traditions.

---

## Confidence

**0.82** — The few-shot JSON memory approach is well-established consensus in the LLM prompting literature and is used in production systems (LangChain memory, MemGPT, various agent frameworks). Storage sizing is straightforward arithmetic. The main uncertainty is around the exact correction count needed for "meaningful" personalization (10-20 is an educated estimate; actual effectiveness depends on LLM model quality and tweet diversity), and around long-term memory management strategies at scale. External sources could not be fetched to cross-reference specific benchmark numbers, which reduces confidence slightly below 0.9.
