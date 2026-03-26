import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const supabase = await createServerClient();

  let query = supabase
    .from("tweets")
    .select("*")
    .eq("user_id", session.user.id)
    .order("tweet_created_at", { ascending: false, nullsFirst: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("tweet_created_at", cursor);
  }

  const { data: tweets, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch tweets" },
      { status: 500 }
    );
  }

  const hasMore = tweets.length > limit;
  const sliced = hasMore ? tweets.slice(0, limit) : tweets;
  const nextCursor = hasMore
    ? sliced[sliced.length - 1].tweet_created_at
    : null;

  // Fetch categories for these tweets
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

  return NextResponse.json({ tweets: tweetsWithCategories, nextCursor });
}
