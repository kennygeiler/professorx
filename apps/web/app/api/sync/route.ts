import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { fetchLikedTweets } from "@/lib/twitter/client";
import { ingestTweets } from "@/lib/services/tweet-ingestion";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string | undefined;
  const twitterId = (session as any).twitterId as string | undefined;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No Twitter access token. Please re-login." },
      { status: 401 }
    );
  }

  if (!twitterId) {
    return NextResponse.json(
      { error: "No Twitter user ID. Please re-login." },
      { status: 401 }
    );
  }

  // Accept optional pagination token from client for incremental sync
  let body: { paginationToken?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine — first page
  }

  const userId = session.user.id;

  // Ensure user exists in DB
  const supabase = createAdminClient();
  await supabase.from("users").upsert(
    {
      id: userId,
      twitter_id: twitterId,
      display_name: session.user.name ?? null,
      avatar_url: session.user.image ?? null,
    },
    { onConflict: "id" }
  );

  try {
    // Fetch ONE page of likes (up to 100 tweets) per request
    const result = await fetchLikedTweets(
      twitterId,
      accessToken,
      body.paginationToken
    );

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    if (result.tweets.length > 0) {
      const tweetsWithSource = result.tweets.map((t) => ({
        ...t,
        source_type: "like" as const,
      }));

      const ingested = await ingestTweets(userId, tweetsWithSource);
      inserted = ingested.inserted;
      updated = ingested.updated;
      errors.push(...ingested.errors);
    }

    return NextResponse.json({
      inserted,
      updated,
      errors,
      nextToken: result.nextToken ?? null,
      tweetCount: result.tweets.length,
      message: `Synced ${inserted} new, ${updated} updated (${result.tweets.length} fetched)`,
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Sync failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}
