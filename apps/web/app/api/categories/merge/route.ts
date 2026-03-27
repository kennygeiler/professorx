import { NextRequest, NextResponse } from "next/server";
import { getLocalUserId } from "@/lib/auth/local-user";
import { mergeCategories } from "@/lib/services/category-management";

export async function POST(request: NextRequest) {
  const userId = await getLocalUserId();

  let body: { sourceId: string; targetId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sourceId, targetId } = body;

  if (!sourceId || !targetId) {
    return NextResponse.json(
      { error: "Missing required fields: sourceId, targetId" },
      { status: 400 }
    );
  }

  if (sourceId === targetId) {
    return NextResponse.json(
      { error: "Source and target categories must be different" },
      { status: 400 }
    );
  }

  try {
    await mergeCategories(userId, sourceId, targetId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Merge failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
