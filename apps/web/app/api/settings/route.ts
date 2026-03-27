import { NextRequest, NextResponse } from "next/server";
import { getLocalUserId } from "@/lib/auth/local-user";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_SETTINGS = {
  sync_likes: true,
  sync_bookmarks: false,
  skip_explanations: false,
};

export async function GET() {
  const userId = await getLocalUserId();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("settings")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }

  return NextResponse.json({
    settings: { ...DEFAULT_SETTINGS, ...(data.settings as Record<string, unknown> ?? {}) },
  });
}

export async function PATCH(request: NextRequest) {
  const userId = await getLocalUserId();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Read current settings, merge with update
  const { data: current } = await supabase
    .from("users")
    .select("settings")
    .eq("id", userId)
    .single();

  const merged = {
    ...DEFAULT_SETTINGS,
    ...(current?.settings as Record<string, unknown> ?? {}),
    ...body,
  };

  const { error } = await supabase
    .from("users")
    .update({ settings: merged as unknown as Record<string, unknown> })
    .eq("id", userId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ settings: merged });
}
