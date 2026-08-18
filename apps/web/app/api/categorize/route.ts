import { NextRequest, NextResponse } from 'next/server';
import { getLocalUserId } from '@/lib/auth/local-user';
import { categorizeTweets } from '@/lib/services/categorization';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const userId = await getLocalUserId();

  let tweetIds: string[] | undefined;

  try {
    const body = await request.json();
    if (body?.tweetIds && Array.isArray(body.tweetIds)) {
      tweetIds = body.tweetIds;
    }
  } catch {
    // Empty body is fine — categorize all uncategorized tweets
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Categorization needs ANTHROPIC_API_KEY in apps/web/.env.local.",
      },
      { status: 503 }
    );
  }

  try {
    const result = await categorizeTweets(userId, tweetIds);

    return NextResponse.json({
      categorized: result.categorized,
      remaining: result.remaining,
      newCategories: result.newCategories,
      errors: result.errors,
    });
  } catch (err) {
    console.error('Categorization failed:', err);
    return NextResponse.json(
      { error: 'Categorization failed' },
      { status: 500 }
    );
  }
}
