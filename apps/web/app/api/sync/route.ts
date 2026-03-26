import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { fetchLikedTweets, fetchBookmarks } from "@/lib/twitter/client";
import { ingestTweets } from "@/lib/services/tweet-ingestion";

export const maxDuration = 60;

export async function POST() {
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

  const userId = session.user.id;
  let totalIngested = 0;
  let totalUpdated = 0;
  const errors: string[] = [];

  try {
    // Fetch likes (paginated, up to 5 pages = 500 tweets per sync)
    let nextToken: string | undefined;
    let pages = 0;
    const maxPages = 5;

    while (pages < maxPages) {
      try {
        const result = await fetchLikedTweets(twitterId, accessToken, nextToken);

        if (result.tweets.length > 0) {
          const tweetsWithSource = result.tweets.map((t) => ({
            ...t,
            source_type: "like" as const,
          }));

          const ingested = await ingestTweets(userId, tweetsWithSource);
          totalIngested += ingested.inserted;
          totalUpdated += ingested.updated;
          if (ingested.errors.length > 0) errors.push(...ingested.errors);
        }

        nextToken = result.nextToken;
        pages++;

        if (!nextToken) break;
      } catch (e) {
        errors.push(`Likes page ${pages + 1}: ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
    }

    // Fetch bookmarks (single page for now)
    try {
      const bookmarkResult = await fetchBookmarks(accessToken);
      if (bookmarkResult.tweets.length > 0) {
        const tweetsWithSource = bookmarkResult.tweets.map((t) => ({
          ...t,
          source_type: "bookmark" as const,
        }));

        const ingested = await ingestTweets(userId, tweetsWithSource);
        totalIngested += ingested.inserted;
        totalUpdated += ingested.updated;
        if (ingested.errors.length > 0) errors.push(...ingested.errors);
      }
    } catch (e) {
      errors.push(`Bookmarks: ${e instanceof Error ? e.message : String(e)}`);
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Sync failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    inserted: totalIngested,
    updated: totalUpdated,
    errors,
    message: `Synced ${totalIngested} new tweets, updated ${totalUpdated}`,
  });
}
