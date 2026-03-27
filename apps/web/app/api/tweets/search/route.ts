import { NextRequest, NextResponse } from "next/server";
import { getLocalUserId } from "@/lib/auth/local-user";
import { createAdminClient } from "@/lib/supabase/admin";

function getDateFromTimeRange(timeRange: string): Date | null {
  const now = new Date();
  switch (timeRange) {
    case "1d":
      return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    case "3d":
      return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    case "1w":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "2w":
      return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    case "1m":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "2m":
      return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    case "3m":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "6m":
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case "1y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = await getLocalUserId();

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category");
  const timeRange = searchParams.get("timeRange") ?? "all";
  const cursor = searchParams.get("cursor");
  const tweetIdsParam = searchParams.get("tweetIds");
  const mediaTypeFilter = searchParams.get("mediaType");
  const sourceTypeFilter = searchParams.get("sourceType");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "20", 10),
    50
  );

  const supabase = createAdminClient();

  // If filtering by specific tweet IDs (from AI search)
  let specificTweetIds: string[] | null = null;
  if (tweetIdsParam) {
    specificTweetIds = tweetIdsParam.split(",").filter(Boolean);
    if (specificTweetIds.length === 0) {
      return NextResponse.json({ tweets: [], nextCursor: null, totalCount: 0 });
    }
  }

  // If filtering by category, we need to get tweet IDs first
  let categoryTweetIds: string[] | null = null;
  if (category) {
    const { data: tweetCats } = await supabase
      .from("tweet_categories")
      .select("tweet_id")
      .eq("category_id", category);

    categoryTweetIds = (tweetCats ?? []).map((tc) => tc.tweet_id);
    if (categoryTweetIds.length === 0) {
      return NextResponse.json({
        tweets: [],
        nextCursor: null,
        totalCount: 0,
      });
    }
  }

  // Build the main query
  let query = supabase
    .from("tweets")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("tweet_created_at", { ascending: false, nullsFirst: false })
    .limit(limit + 1);

  // Full-text search filter (with author fallback for @ queries)
  if (q.length >= 3) {
    const isAuthorSearch = q.startsWith("@");
    if (isAuthorSearch) {
      const handle = q.replace(/^@/, "").toLowerCase();
      query = query.or(`author_handle.ilike.%${handle}%,author_display_name.ilike.%${handle}%`);
    } else {
      query = query.textSearch("search_vector", q, {
        type: "plain",
        config: "english",
      });
    }
  }

  // Specific tweet IDs filter (from AI search)
  if (specificTweetIds) {
    query = query.in("id", specificTweetIds);
  }

  // Category filter via tweet IDs
  if (categoryTweetIds) {
    query = query.in("id", categoryTweetIds);
  }

  // Time range filter — show tweets FROM that date and older
  const sinceDate = getDateFromTimeRange(timeRange);
  if (sinceDate) {
    query = query.lte("tweet_created_at", sinceDate.toISOString());
  }

  // Uncategorized filter
  if (mediaTypeFilter === "uncategorized") {
    // Get tweet IDs that have NO category
    const { data: allUserTweets } = await supabase
      .from("tweets")
      .select("id")
      .eq("user_id", userId)
      .limit(500);
    const allIds = (allUserTweets ?? []).map((t) => t.id);
    if (allIds.length > 0) {
      // Check which have categories in chunks
      const categorizedIds = new Set<string>();
      for (let i = 0; i < allIds.length; i += 200) {
        const chunk = allIds.slice(i, i + 200);
        const { data: catChunk } = await supabase
          .from("tweet_categories")
          .select("tweet_id")
          .in("tweet_id", chunk);
        for (const tc of catChunk ?? []) categorizedIds.add(tc.tweet_id);
      }
      const uncatIds = allIds.filter((id) => !categorizedIds.has(id));
      if (uncatIds.length === 0) {
        return NextResponse.json({ tweets: [], nextCursor: null, totalCount: 0 });
      }
      query = query.in("id", uncatIds);
    }
  }

  // Media type filter (skip if uncategorized — that's handled above)
  if (mediaTypeFilter === "photo") {
    query = query.filter("media", "cs", '[{"type":"photo"}]');
  } else if (mediaTypeFilter === "video") {
    query = query.or('media.cs.[{"type":"video"}],media.cs.[{"type":"animated_gif"}]');
  } else if (mediaTypeFilter === "quote") {
    query = query.eq("tweet_type", "quote");
  } else if (mediaTypeFilter === "text") {
    query = query.filter("media", "eq", "[]");
  }

  // Source type filter (like/bookmark)
  if (sourceTypeFilter === "like" || sourceTypeFilter === "bookmark") {
    query = query.eq("source_type", sourceTypeFilter);
  }

  // Cursor pagination
  if (cursor) {
    query = query.lt("tweet_created_at", cursor);
  }

  const { data: tweets, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to search tweets" },
      { status: 500 }
    );
  }

  const hasMore = (tweets?.length ?? 0) > limit;
  const sliced = hasMore ? tweets!.slice(0, limit) : (tweets ?? []);
  const nextCursor = hasMore
    ? sliced[sliced.length - 1].tweet_created_at
    : null;

  // Fetch categories for the result tweets
  const tweetIds = sliced.map((t) => t.id);
  const { data: tweetCategories } = await supabase
    .from("tweet_categories")
    .select("tweet_id, category_id")
    .in("tweet_id", tweetIds.length > 0 ? tweetIds : ["__none__"]);

  const categoryIds = [
    ...new Set((tweetCategories ?? []).map((tc) => tc.category_id)),
  ];
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, color")
    .in("id", categoryIds.length > 0 ? categoryIds : ["__none__"]);

  const categoryMap = new Map(
    (categories ?? []).map((c) => [c.id, c])
  );

  const tweetsWithCategories = sliced.map((tweet) => {
    const tcEntries = (tweetCategories ?? []).filter(
      (tc) => tc.tweet_id === tweet.id
    );
    const cats = tcEntries
      .map((tc) => categoryMap.get(tc.category_id))
      .filter(Boolean);
    return { ...tweet, categories: cats };
  });

  return NextResponse.json({
    tweets: tweetsWithCategories,
    nextCursor,
    totalCount: count ?? 0,
  });
}
