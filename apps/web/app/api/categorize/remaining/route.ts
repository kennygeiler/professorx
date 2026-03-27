import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/lib/auth/resolve-user';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { count: totalTweets } = await supabase
    .from('tweets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Count categorized tweets in chunks to avoid URL limits
  const { data: userTweets } = await supabase
    .from('tweets')
    .select('id')
    .eq('user_id', userId);

  const userTweetIds = (userTweets ?? []).map((t) => t.id);
  let categorizedCount = 0;

  for (let i = 0; i < userTweetIds.length; i += 200) {
    const chunk = userTweetIds.slice(i, i + 200);
    const { data: catChunk } = await supabase
      .from('tweet_categories')
      .select('tweet_id')
      .in('tweet_id', chunk);
    const uniqueInChunk = new Set((catChunk ?? []).map((tc) => tc.tweet_id));
    categorizedCount += uniqueInChunk.size;
  }

  return NextResponse.json({
    remaining: Math.max(0, (totalTweets ?? 0) - categorizedCount),
    _debug: { userId, totalTweets, categorizedCount },
  });
}
