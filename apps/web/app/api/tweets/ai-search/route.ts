import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

export const maxDuration = 60;

const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { query: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query } = body;
  if (!query || query.length < 3) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch all tweets for this user (text + id, limited to 500 for performance)
  const { data: tweets, error } = await supabase
    .from("tweets")
    .select("id, text_content, author_handle")
    .eq("user_id", session.user.id)
    .order("tweet_created_at", { ascending: false })
    .limit(500);

  if (error || !tweets || tweets.length === 0) {
    return NextResponse.json({ tweetIds: [] });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const matchingIds: string[] = [];

  // Process in batches
  for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
    const batch = tweets.slice(i, i + BATCH_SIZE);
    const tweetList = batch
      .map((t, idx) => `[${idx}] @${t.author_handle}: ${t.text_content.slice(0, 200)}`)
      .join("\n");

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a tweet search engine. Given a user query and a list of tweets, return ONLY the indices of tweets that match the query. Return a JSON array of numbers, e.g. [0, 3, 7]. If none match, return []. No explanation.",
          },
          {
            role: "user",
            content: `Query: "${query}"\n\nTweets:\n${tweetList}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 256,
      });

      const raw = completion.choices[0]?.message?.content?.trim();
      if (raw) {
        try {
          const indices = JSON.parse(raw) as number[];
          for (const idx of indices) {
            if (idx >= 0 && idx < batch.length) {
              matchingIds.push(batch[idx].id);
            }
          }
        } catch {
          // Skip unparseable response
        }
      }
    } catch {
      // Skip batch on error, continue with next
    }
  }

  return NextResponse.json({ tweetIds: matchingIds });
}
