import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerClient();

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
