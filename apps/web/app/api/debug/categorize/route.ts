import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";

export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not logged in" });
  }

  const steps: Record<string, unknown> = {};

  // Step 1: Check OpenAI key
  steps.hasOpenAiKey = !!process.env.OPENAI_API_KEY;
  steps.openAiKeyPrefix = process.env.OPENAI_API_KEY?.slice(0, 10) + "...";

  // Step 2: Get uncategorized tweet count
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("tweets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id);
  steps.totalTweets = count;

  // Step 3: Check existing categories
  const { data: cats } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", session.user.id);
  steps.existingCategories = cats?.length ?? 0;

  // Step 4: Get 2 sample tweets
  const { data: sample } = await supabase
    .from("tweets")
    .select("id, text_content, author_handle")
    .eq("user_id", session.user.id)
    .limit(2);
  steps.sampleTweets = sample;

  // Step 5: Try a minimal OpenAI call
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Respond with valid JSON only." },
        { role: "user", content: 'Categorize this tweet into one category. Respond as JSON: {"category": "...", "confidence": 0.9}\n\nTweet: "I love building with Next.js"' },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });
    steps.openAiTest = {
      success: true,
      response: completion.choices[0]?.message?.content,
    };
  } catch (e) {
    steps.openAiTest = {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(steps);
}
