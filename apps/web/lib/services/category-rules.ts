/**
 * Extracts a clean categorization rule from a user's correction reason.
 *
 * @param originalCategory - The category the AI originally assigned
 * @param correctedCategory - The category the user corrected it to
 * @param reason - The user's explanation for the correction
 * @returns A formatted rule string for the AI to reference in future categorizations
 */
export function extractRule(
  originalCategory: string,
  correctedCategory: string,
  reason: string
): string {
  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    return `Tweets categorized as "${originalCategory}" should be recategorized as "${correctedCategory}".`;
  }

  // If the reason already reads like a complete rule, use it directly with context
  const looksLikeRule =
    trimmedReason.toLowerCase().startsWith('tweets about') ||
    trimmedReason.toLowerCase().startsWith('if ') ||
    trimmedReason.toLowerCase().startsWith('when ');

  if (looksLikeRule) {
    return `${trimmedReason} (move from "${originalCategory}" to "${correctedCategory}")`;
  }

  return `${trimmedReason} — should go to "${correctedCategory}", not "${originalCategory}".`;
}
