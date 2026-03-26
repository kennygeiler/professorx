import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { categorizeTweets } from '@/lib/services/categorization';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
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
    const result = await categorizeTweets(session.user.id, tweetIds);

    return NextResponse.json({
      categorized: result.categorized,
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
