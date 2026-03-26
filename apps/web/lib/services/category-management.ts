import { createAdminClient } from "@/lib/supabase/admin";

export async function mergeCategories(
  userId: string,
  sourceId: string,
  targetId: string
) {
  const supabase = createAdminClient();

  // Verify both categories belong to the user
  const { data: cats, error: catError } = await supabase
    .from("categories")
    .select("id, name, tweet_count")
    .eq("user_id", userId)
    .in("id", [sourceId, targetId]);

  if (catError || !cats || cats.length !== 2) {
    throw new Error("One or both categories not found");
  }

  // Get all tweet_categories for the source category
  const { data: sourceTweetCats } = await supabase
    .from("tweet_categories")
    .select("id, tweet_id")
    .eq("category_id", sourceId);

  if (sourceTweetCats && sourceTweetCats.length > 0) {
    // Get tweet_ids that already have the target category
    const { data: existingTargetTweetCats } = await supabase
      .from("tweet_categories")
      .select("tweet_id")
      .eq("category_id", targetId);

    const existingTargetTweetIds = new Set(
      (existingTargetTweetCats ?? []).map((tc) => tc.tweet_id)
    );

    // For tweets that already have the target category, just delete the source entry
    const duplicateIds = sourceTweetCats
      .filter((tc) => existingTargetTweetIds.has(tc.tweet_id))
      .map((tc) => tc.id);

    if (duplicateIds.length > 0) {
      await supabase
        .from("tweet_categories")
        .delete()
        .in("id", duplicateIds);
    }

    // For tweets that don't have the target category, reassign
    const reassignIds = sourceTweetCats
      .filter((tc) => !existingTargetTweetIds.has(tc.tweet_id))
      .map((tc) => tc.id);

    if (reassignIds.length > 0) {
      await supabase
        .from("tweet_categories")
        .update({ category_id: targetId })
        .in("id", reassignIds);
    }
  }

  // Delete the source category
  await supabase.from("categories").delete().eq("id", sourceId);

  // Recount the target category's tweet_count
  const { count } = await supabase
    .from("tweet_categories")
    .select("id", { count: "exact", head: true })
    .eq("category_id", targetId);

  await supabase
    .from("categories")
    .update({ tweet_count: count ?? 0 })
    .eq("id", targetId);

  return { success: true };
}

export async function deleteCategory(userId: string, categoryId: string) {
  const supabase = createAdminClient();

  // Verify category belongs to user
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .single();

  if (catError || !category) {
    throw new Error("Category not found");
  }

  // Remove all tweet_categories rows for this category
  await supabase
    .from("tweet_categories")
    .delete()
    .eq("category_id", categoryId);

  // Delete the category itself
  await supabase.from("categories").delete().eq("id", categoryId);

  return { success: true };
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  data: { name?: string; color?: string }
) {
  const supabase = createAdminClient();

  // Verify category belongs to user
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .single();

  if (catError || !category) {
    throw new Error("Category not found");
  }

  const updatePayload: Record<string, string> = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.color !== undefined) updatePayload.color = data.color;

  const { data: updated, error: updateError } = await supabase
    .from("categories")
    .update(updatePayload)
    .eq("id", categoryId)
    .select("id, name, color, tweet_count")
    .single();

  if (updateError || !updated) {
    throw new Error("Failed to update category");
  }

  return updated;
}
