import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolves the stable internal user ID from a Twitter ID.
 * NextAuth's session.user.id (token.sub) can change between sessions,
 * but twitter_id is stable. This looks up the existing user by twitter_id
 * and returns their DB id, or falls back to the session ID for new users.
 */
export async function getStableUserId(
  sessionUserId: string,
  twitterId: string
): Promise<string> {
  const supabase = createAdminClient();

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("twitter_id", twitterId)
    .maybeSingle();

  return existingUser?.id ?? sessionUserId;
}
