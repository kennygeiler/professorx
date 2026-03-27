import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildCategorizationPrompt } from './prompt-builder';
import { getAiMemory } from './ai-memory';

const BATCH_SIZE = 10;

const CATEGORY_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7",
  "#ec4899", "#06b6d4", "#6366f1", "#14b8a6", "#f97316",
  "#f43f5e", "#8b5cf6", "#10b981", "#e879f9", "#0ea5e9",
  "#84cc16", "#fb923c", "#64748b",
];

export interface CategorizationResult {
  categorized: number;
  remaining: number;
  newCategories: string[];
  errors: string[];
}

interface AiAssignment {
  tweet_id: string;
  categories: string[];
  // Legacy single-category fallback
  category?: string;
  confidence: number;
}

interface AiSuggestionResponse {
  suggested_categories: string[];
  assignments: AiAssignment[];
}

/**
 * Categorizes uncategorized tweets (or specific tweet IDs) for a user.
 */
export async function categorizeTweets(
  userId: string,
  tweetIds?: string[]
): Promise<CategorizationResult> {
  const supabase = createAdminClient();
  const result: CategorizationResult = {
    categorized: 0,
    remaining: 0,
    newCategories: [],
    errors: [],
  };

  // Fetch tweets to categorize
  let tweets: { id: string; text_content: string; author_handle: string | null }[] | null = null;
  let tweetsError: { message: string } | null = null;

  if (tweetIds && tweetIds.length > 0) {
    const res = await supabase
      .from('tweets')
      .select('id, text_content, author_handle')
      .eq('user_id', userId)
      .in('id', tweetIds);
    tweets = res.data;
    tweetsError = res.error;
  } else {
    // Fetch a batch of tweets, then filter out ones that already have categories
    // This avoids a huge NOT IN clause that can exceed URL limits
    const { data: candidateTweets, error: candidateError } = await supabase
      .from('tweets')
      .select('id, text_content, author_handle')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (candidateError) {
      tweetsError = candidateError;
    } else if (candidateTweets && candidateTweets.length > 0) {
      // Check which of these candidates already have categories
      const candidateIds = candidateTweets.map((t) => t.id);
      const { data: existingCats } = await supabase
        .from('tweet_categories')
        .select('tweet_id')
        .in('tweet_id', candidateIds);

      const categorizedSet = new Set(
        (existingCats ?? []).map((tc) => tc.tweet_id)
      );

      tweets = candidateTweets
        .filter((t) => !categorizedSet.has(t.id))
        .slice(0, 30);
    } else {
      tweets = [];
    }
  }

  console.log(`[Categorize] Found ${tweets?.length ?? 0} uncategorized tweets for user ${userId}`);

  if (tweetsError) {
    result.errors.push(`Failed to fetch tweets: ${tweetsError.message}`);
    return result;
  }

  if (!tweets || tweets.length === 0) {
    return result;
  }

  // Fetch user's categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  const categoryList = (categories ?? []).map((c) => c.name);
  const categoryNameToId = new Map(
    (categories ?? []).map((c) => [c.name, c.id])
  );

  // Fetch AI memory
  const memory = await getAiMemory(userId);

  // Process in batches of BATCH_SIZE
  const batches: { id: string; text: string; author: string }[][] = [];
  for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
    batches.push(
      tweets.slice(i, i + BATCH_SIZE).map((t) => ({
        id: t.id,
        text: t.text_content,
        author: t.author_handle ?? 'unknown',
      }))
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const hasCategories = categoryList.length > 0;

  for (const batch of batches) {
    try {
      const prompt = buildCategorizationPrompt(
        categoryList,
        memory.corrections,
        memory.category_rules,
        batch
      );

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a tweet categorization engine. Respond only with valid JSON, no markdown fences or extra text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      });

      const raw = completion.choices[0]?.message?.content?.trim();
      if (!raw) {
        result.errors.push('Empty response from AI');
        continue;
      }

      let assignments: AiAssignment[];

      if (hasCategories) {
        // Parse as direct assignment array
        assignments = JSON.parse(raw) as AiAssignment[];
      } else {
        // Parse as suggestion response with new categories
        const suggestion = JSON.parse(raw) as AiSuggestionResponse;

        // Create the suggested categories
        for (const catName of suggestion.suggested_categories) {
          if (!categoryNameToId.has(catName)) {
            const colorIdx = categoryNameToId.size % CATEGORY_COLORS.length;
            const { data: newCat, error: catError } = await supabase
              .from('categories')
              .insert({
                user_id: userId,
                name: catName,
                color: CATEGORY_COLORS[colorIdx],
                sort_order: categoryNameToId.size,
              })
              .select('id')
              .single();

            if (catError) {
              result.errors.push(
                `Failed to create category "${catName}": ${catError.message}`
              );
              continue;
            }

            categoryNameToId.set(catName, newCat.id);
            categoryList.push(catName);
            result.newCategories.push(catName);
          }
        }

        assignments = suggestion.assignments;
      }

      // Insert tweet_categories records (supports 1-2 categories per tweet)
      for (const assignment of assignments) {
        // Support both new multi-category and legacy single-category format
        const catNames = assignment.categories?.length
          ? assignment.categories.slice(0, 2)
          : assignment.category
            ? [assignment.category]
            : [];

        let assigned = false;
        for (const catName of catNames) {
          const catId = categoryNameToId.get(catName);
          if (!catId) {
            result.errors.push(
              `Unknown category "${catName}" for tweet ${assignment.tweet_id}`
            );
            continue;
          }

          const { error: insertError } = await supabase
            .from('tweet_categories')
            .insert({
              tweet_id: assignment.tweet_id,
              category_id: catId,
              assigned_by: 'ai',
              confidence: assignment.confidence,
            });

          if (insertError) {
            if (!insertError.message.includes('duplicate')) {
              result.errors.push(
                `Failed to assign tweet ${assignment.tweet_id}: ${insertError.message}`
              );
            }
            continue;
          }
          assigned = true;
        }

        if (assigned) {
          // Update ai_confidence on the tweet
          await supabase
            .from('tweets')
            .update({ ai_confidence: assignment.confidence })
            .eq('id', assignment.tweet_id);

          result.categorized += 1;
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      result.errors.push(`Batch error: ${message}`);
    }
  }

  // Update tweet_count on all categories for this user
  const { data: allCats } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId);
  for (const cat of allCats ?? []) {
    const { count } = await supabase
      .from('tweet_categories')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', cat.id);
    await supabase
      .from('categories')
      .update({ tweet_count: count ?? 0 })
      .eq('id', cat.id);
  }

  // Count remaining uncategorized tweets
  const { count: totalUserTweets } = await supabase
    .from('tweets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Count distinct categorized tweets for this user
  const { data: userTweets } = await supabase
    .from('tweets')
    .select('id')
    .eq('user_id', userId);
  const userTweetIds = (userTweets ?? []).map((t) => t.id);

  let categorizedCount = 0;
  if (userTweetIds.length > 0) {
    // Check in chunks of 200 to avoid URL limits
    for (let i = 0; i < userTweetIds.length; i += 200) {
      const chunk = userTweetIds.slice(i, i + 200);
      const { data: catChunk } = await supabase
        .from('tweet_categories')
        .select('tweet_id')
        .in('tweet_id', chunk);
      const uniqueInChunk = new Set((catChunk ?? []).map((tc) => tc.tweet_id));
      categorizedCount += uniqueInChunk.size;
    }
  }

  result.remaining = Math.max(0, (totalUserTweets ?? 0) - categorizedCount);

  return result;
}
