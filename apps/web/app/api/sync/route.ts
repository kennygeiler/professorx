import { NextResponse } from "next/server";
import { getLocalUserId } from "@/lib/auth/local-user";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST() {
  const userId = await getLocalUserId();

  // Ensure user exists in DB
  const supabase = createAdminClient();
  await supabase.from("users").upsert(
    { id: userId },
    { onConflict: "id" }
  );

  // No Twitter API sync — tweets come in via the ingest endpoint from the extension.
  // This endpoint now just confirms the user exists and returns a no-op response.
  const { count: totalTweets } = await supabase
    .from("tweets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return NextResponse.json({
    inserted: 0,
    updated: 0,
    errors: [],
    nextToken: null,
    bookmarkNextToken: null,
    tweetCount: totalTweets ?? 0,
    message: "Sync is handled by the browser extension. Use the extension to import tweets.",
  });
}
