import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, color, tweet_count")
    .eq("user_id", session.user.id)
    .order("tweet_count", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }

  return NextResponse.json({ categories: categories ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "Category name is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      user_id: session.user.id,
      name: body.name.trim(),
      color: body.color ?? "#71717a",
    })
    .select("id, name, color, tweet_count")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }

  return NextResponse.json({ category }, { status: 201 });
}
