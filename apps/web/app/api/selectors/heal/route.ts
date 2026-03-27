import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  let body: {
    brokenSelectors: Record<string, string>;
    domSnapshot: string;
    currentSelectors: Record<string, string>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { brokenSelectors, domSnapshot, currentSelectors } = body;

  if (!domSnapshot || !currentSelectors) {
    return NextResponse.json({ error: "Missing domSnapshot or currentSelectors" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const brokenList = Object.entries(brokenSelectors)
    .map(([name, selector]) => `- ${name}: ${selector}`)
    .join("\n");

  const currentList = Object.entries(currentSelectors)
    .map(([name, selector]) => `- ${name}: ${selector}`)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a CSS selector expert. Given a DOM snapshot from Twitter/X and a list of broken CSS selectors, generate updated selectors that match the current DOM structure. Respond ONLY with valid JSON — an object where keys are selector names and values are the new CSS selector strings. No explanation.",
        },
        {
          role: "user",
          content: `The following CSS selectors no longer match any elements on Twitter/X:\n\n${brokenList}\n\nAll current selectors:\n${currentList}\n\nHere is a sample of the current Twitter DOM structure (first article element):\n\n${domSnapshot.slice(0, 4000)}\n\nGenerate updated CSS selectors for ONLY the broken ones. Return a JSON object like: {"tweetText": "div[data-testid=\\"tweetText\\"]"}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 512,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const fixes = JSON.parse(raw) as Record<string, string>;
    return NextResponse.json({ fixes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `AI heal failed: ${msg}` }, { status: 500 });
  }
}
