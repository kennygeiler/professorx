import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/lib/auth/resolve-user';
import { categorizeTweets } from '@/lib/services/categorization';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const userId = await getEffectiveUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let tweetIds: string[] | undefined;

  try {
    const body = await request.json();
    if (body?.tweetIds && Array.isArray(body.tweetIds)) {
      tweetIds = body.tweetIds;
    }
  } catch {
    // Empty body is fine — categorize all uncategorized tweets
  }

  try {
    const result = await categorizeTweets(userId, tweetIds);

    return NextResponse.json({
      categorized: result.categorized,
      remaining: result.remaining,
      newCategories: result.newCategories,
      errors: result.errors,
      _debug: { userId },
    });
  } catch (err) {
    console.error('Categorization failed:', err);
    return NextResponse.json(
      { error: 'Categorization failed' },
      { status: 500 }
    );
  }
}
