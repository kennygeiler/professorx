import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not logged in" });
  }

  const supabase = createAdminClient();
  const userId = session.user.id;

  // Check if user exists in users table
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  // Count tweets
  const { count, error: countError } = await supabase
    .from("tweets")
    .select("*", { count: "exact", head: true });

  // Try inserting a test tweet
  const testResult = await supabase.from("tweets").insert({
    user_id: userId,
    twitter_tweet_id: "test_123",
    text_content: "Test tweet",
  });

  // Clean up test
  await supabase.from("tweets").delete().eq("twitter_tweet_id", "test_123");

  return NextResponse.json({
    sessionUserId: userId,
    userExistsInDb: !!userRow,
    userError: userError?.message,
    tweetCount: count,
    countError: countError?.message,
    testInsertError: testResult.error?.message ?? null,
    testInsertCode: testResult.error?.code ?? null,
  });
}
