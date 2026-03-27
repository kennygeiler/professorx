import { auth } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Finds the user ID that actually owns tweets for a given twitter_id.
 * Handles the case where multiple user rows exist due to session ID instability.
 */
export async function resolveUserWithTweets(
  sessionUserId: string,
  twitterId?: string
): Promise<string> {
  if (!twitterId) return sessionUserId;

  const supabase = createAdminClient();
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .eq("twitter_id", twitterId);

  if (!users || users.length <= 1) return users?.[0]?.id ?? sessionUserId;

  // Multiple user rows — find which one has tweets
  for (const u of users) {
    const { count } = await supabase
      .from("tweets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id);
    if ((count ?? 0) > 0) return u.id;
  }

  return sessionUserId;
}

/**
 * Get the effective user ID from the current session.
 * Resolves across multiple user rows created by session ID instability.
 * Returns null if not authenticated.
 */
export async function getEffectiveUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const twitterId = (session as any).twitterId as string | undefined;
  return resolveUserWithTweets(session.user.id, twitterId);
}
