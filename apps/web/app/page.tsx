import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState } from "@/components/tweets/empty-state";
import { LibraryView } from "@/components/library/library-view";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import type { Database } from "@/lib/supabase/types";

type TweetRow = Database["public"]["Tables"]["tweets"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export interface TweetWithCategories extends TweetRow {
  categories: Pick<CategoryRow, "id" | "name" | "color">[];
}

async function getInitialTweets(
  userId: string
): Promise<{ tweets: TweetWithCategories[]; nextCursor: string | null }> {
  const supabase = createAdminClient();
  const limit = 20;

  const { data: tweets, error } = await supabase
    .from("tweets")
    .select("*")
    .eq("user_id", userId)
    .order("tweet_created_at", { ascending: false, nullsFirst: false })
    .limit(limit + 1);

  if (error || !tweets) {
    return { tweets: [], nextCursor: null };
  }

  const hasMore = tweets.length > limit;
  const sliced = hasMore ? tweets.slice(0, limit) : tweets;
  const nextCursor = hasMore
    ? sliced[sliced.length - 1].tweet_created_at
    : null;

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

  const tweetsWithCategories: TweetWithCategories[] = sliced.map((tweet) => {
    const tcEntries = (tweetCategories ?? []).filter(
      (tc) => tc.tweet_id === tweet.id
    );
    const cats = tcEntries
      .map((tc) => categoryMap.get(tc.category_id))
      .filter(Boolean) as Pick<CategoryRow, "id" | "name" | "color">[];
    return { ...tweet, categories: cats };
  });

  return { tweets: tweetsWithCategories, nextCursor };
}

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tweets, nextCursor } = await getInitialTweets(session.user.id);

  if (tweets.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
          <LibraryView initialTweets={tweets} initialCursor={nextCursor} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
