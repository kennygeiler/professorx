import { NextRequest, NextResponse } from "next/server";
import { getLocalUserId } from "@/lib/auth/local-user";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  const userId = await getLocalUserId();

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

  // Without a key every model call below fails and the catch swallows it, so
  // the response would be an empty match list — indistinguishable from "your
  // library has nothing about this". Say what is actually wrong instead.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "AI search needs ANTHROPIC_API_KEY in apps/web/.env.local. Keyword search works without it.",
      },
      { status: 503 }
    );
  }

  const supabase = createAdminClient();

  // Fetch all tweets for this user (text + id, limited to 500 for performance)
  const { data: tweets, error } = await supabase
    .from("tweets")
    .select("id, text_content, author_handle")
    .eq("user_id", userId)
    .order("tweet_created_at", { ascending: false })
    .limit(500);

  if (error || !tweets || tweets.length === 0) {
    return NextResponse.json({ tweetIds: [] });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const matchingIds: string[] = [];

  // Process in batches
  for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
    const batch = tweets.slice(i, i + BATCH_SIZE);
    const tweetList = batch
      .map((t, idx) => `[${idx}] @${t.author_handle}: ${t.text_content.slice(0, 200)}`)
      .join("\n");

    try {
      const message = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 4096,
        // Matching tweets to a query is a scoped classification task, so the
        // batches run at low effort to keep search responsive.
        output_config: {
          effort: "low",
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                indices: {
                  type: "array",
                  items: { type: "integer" },
                  description: "Indices of tweets matching the query.",
                },
              },
              required: ["indices"],
              additionalProperties: false,
            },
          },
        },
        system:
          "You are a tweet search engine. Given a user query and a numbered list of tweets, return the indices of the tweets that match the query. Return an empty array if none match.",
        messages: [
          {
            role: "user",
            content: `Query: "${query}"\n\nTweets:\n${tweetList}`,
          },
        ],
      });

      const raw = message.content.find((b) => b.type === "text")?.text;
      if (raw) {
        try {
          const { indices } = JSON.parse(raw) as { indices: number[] };
          for (const idx of indices ?? []) {
            if (idx >= 0 && idx < batch.length) {
              matchingIds.push(batch[idx].id);
            }
          }
        } catch {
          // Skip unparseable response
        }
      }
    } catch (err) {
      // Skip batch on error, continue with next
      console.error("AI search batch failed:", err);
    }
  }

  return NextResponse.json({ tweetIds: matchingIds });
}
