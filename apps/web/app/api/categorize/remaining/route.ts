import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const userId = session.user.id;

  const { count: totalTweets } = await supabase
    .from('tweets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: categorizedIds } = await supabase
    .from('tweet_categories')
    .select('tweet_id')
    .limit(10000);

  const uniqueCategorized = new Set(
    (categorizedIds ?? []).map((tc) => tc.tweet_id)
  ).size;

  return NextResponse.json({
    remaining: Math.max(0, (totalTweets ?? 0) - uniqueCategorized),
  });
}
