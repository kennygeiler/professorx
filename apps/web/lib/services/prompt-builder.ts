import type { AiCorrection, AiCategoryRule } from '@shared/types/ai-memory';

/**
 * Builds the categorization prompt for GPT-4o-mini.
 *
 * When categories exist, the AI categorizes tweets into those categories.
 * When no categories exist, the AI suggests 5-7 initial categories based on tweet content.
 */
export function buildCategorizationPrompt(
  categories: string[],
  corrections: AiCorrection[],
  rules: AiCategoryRule[],
  tweets: { id: string; text: string; author: string }[]
): string {
  const hasCategories = categories.length > 0;

  let prompt = '';

  // --- System instructions ---
  if (hasCategories) {
    prompt += `You are a tweet categorization assistant. Your job is to assign each tweet to the single most appropriate category from the user's category list.\n\n`;
    prompt += `## Categories\n`;
    prompt += categories.map((c) => `- ${c}`).join('\n');
    prompt += '\n\n';
  } else {
    prompt += `You are a tweet categorization assistant. The user has no categories yet. Analyze the tweets below and:\n`;
    prompt += `1. Suggest 5-7 initial categories that best group these tweets.\n`;
    prompt += `2. Assign each tweet to one of your suggested categories.\n\n`;
    prompt += `Choose category names that are concise, descriptive, and broadly useful (e.g., "Tech", "Politics", "Humor", "Sports", "Science").\n\n`;
  }

  // --- Few-shot corrections (most recent 10) ---
  const recentCorrections = corrections.slice(-10);
  if (recentCorrections.length > 0) {
    prompt += `## Past Corrections (learn from these)\n`;
    prompt += `The user previously corrected these categorizations. Use them to improve accuracy:\n\n`;
    for (const c of recentCorrections) {
      prompt += `- Tweet: "${truncate(c.tweet_text, 120)}"\n`;
      prompt += `  Wrong: "${c.original_category}" → Correct: "${c.corrected_category}"`;
      if (c.user_reason) {
        prompt += ` (Reason: ${c.user_reason})`;
      }
      prompt += '\n';
    }
    prompt += '\n';
  }

  // --- Category rules ---
  if (rules.length > 0) {
    prompt += `## Category Rules\n`;
    prompt += `Follow these rules when categorizing:\n\n`;
    for (const r of rules) {
      prompt += `- ${r.rule}\n`;
    }
    prompt += '\n';
  }

  // --- Tweets to categorize ---
  prompt += `## Tweets to Categorize\n\n`;
  for (const tweet of tweets) {
    prompt += `[${tweet.id}] @${tweet.author}: ${truncate(tweet.text, 500)}\n\n`;
  }

  // --- Response format ---
  if (hasCategories) {
    prompt += `## Response Format\n`;
    prompt += `Respond with ONLY a JSON array. Each element must have:\n`;
    prompt += `- "tweet_id": the tweet ID from the brackets above\n`;
    prompt += `- "category": one of the categories listed above (exact match)\n`;
    prompt += `- "confidence": a number from 0.0 to 1.0\n\n`;
    prompt += `Example: [{"tweet_id":"abc123","category":"Tech","confidence":0.92}]\n`;
  } else {
    prompt += `## Response Format\n`;
    prompt += `Respond with ONLY a JSON object with two fields:\n`;
    prompt += `- "suggested_categories": array of 5-7 category name strings\n`;
    prompt += `- "assignments": array of {"tweet_id", "category", "confidence"}\n\n`;
    prompt += `Example: {"suggested_categories":["Tech","Politics","Humor"],"assignments":[{"tweet_id":"abc123","category":"Tech","confidence":0.85}]}\n`;
  }

  return prompt;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
