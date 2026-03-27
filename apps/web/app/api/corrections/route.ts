import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { addCorrection, addCategoryRule } from '@/lib/services/ai-memory';
import { extractRule } from '@/lib/services/category-rules';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    tweetId: string;
    originalCategory: string;
    correctedCategoryId: string;
    reason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tweetId, originalCategory, correctedCategoryId, reason } = body;

  if (!tweetId || !originalCategory || !correctedCategoryId) {
    return NextResponse.json(
      { error: 'Missing required fields: tweetId, originalCategory, correctedCategoryId' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Look up the corrected category name
  const { data: correctedCat, error: catError } = await supabase
    .from('categories')
    .select('name')
    .eq('id', correctedCategoryId)
    .single();

  if (catError || !correctedCat) {
    return NextResponse.json(
      { error: 'Corrected category not found' },
      { status: 404 }
    );
  }

  // Get the tweet text for the correction record
  const { data: tweet } = await supabase
    .from('tweets')
    .select('text_content')
    .eq('id', tweetId)
    .single();

  // Update existing tweet_categories record or insert new one
  const { data: existingTc } = await supabase
    .from('tweet_categories')
    .select('id')
    .eq('tweet_id', tweetId)
    .maybeSingle();

  if (existingTc) {
    const { error: updateError } = await supabase
      .from('tweet_categories')
      .update({
        category_id: correctedCategoryId,
        assigned_by: 'user',
        confidence: 1.0,
      })
      .eq('id', existingTc.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update category: ${updateError.message}` },
        { status: 500 }
      );
    }
  } else {
    const { error: insertError } = await supabase
      .from('tweet_categories')
      .insert({
        tweet_id: tweetId,
        category_id: correctedCategoryId,
        assigned_by: 'user',
        confidence: 1.0,
      });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to assign category: ${insertError.message}` },
        { status: 500 }
      );
    }
  }

  // Add correction to AI memory
  try {
    await addCorrection(session.user.id, {
      tweet_text: tweet?.text_content ?? '',
      tweet_id: tweetId,
      original_category: originalCategory,
      corrected_category: correctedCat.name,
      user_reason: reason,
    });
  } catch (err) {
    console.error('Failed to save AI correction:', err);
    // Non-fatal: the category update already succeeded
  }

  // If reason provided, extract and add a category rule
  if (reason && reason.trim()) {
    try {
      const rule = extractRule(originalCategory, correctedCat.name, reason);
      await addCategoryRule(session.user.id, rule);
    } catch (err) {
      console.error('Failed to save category rule:', err);
    }
  }

  // Update category tweet counts
  const { data: allUserCats } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', session.user.id);
  for (const cat of allUserCats ?? []) {
    const { count } = await supabase
      .from('tweet_categories')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', cat.id);
    await supabase
      .from('categories')
      .update({ tweet_count: count ?? 0 })
      .eq('id', cat.id);
  }

  // Return updated tweet categories
  const { data: updatedCategories } = await supabase
    .from('tweet_categories')
    .select('tweet_id, category_id, assigned_by, confidence')
    .eq('tweet_id', tweetId);

  return NextResponse.json({
    success: true,
    tweetCategories: updatedCategories ?? [],
  });
}
