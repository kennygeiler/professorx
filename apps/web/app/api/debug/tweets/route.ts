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

  // Count all tweets
  const { count: totalCount, error: countError } = await supabase
    .from("tweets")
    .select("*", { count: "exact", head: true });

  // Count tweets for this user
  const { count: userCount, error: userError } = await supabase
    .from("tweets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Get first 3 tweets raw
  const { data: sample, error: sampleError } = await supabase
    .from("tweets")
    .select("id, user_id, twitter_tweet_id, text_content")
    .limit(3);

  return NextResponse.json({
    sessionUserId: userId,
    totalTweetsInDb: totalCount,
    totalCountError: countError?.message,
    tweetsForUser: userCount,
    userCountError: userError?.message,
    sampleTweets: sample,
    sampleError: sampleError?.message,
  });
}
