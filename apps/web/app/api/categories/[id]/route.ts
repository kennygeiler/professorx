import { NextRequest, NextResponse } from "next/server";
import { getLocalUserId } from "@/lib/auth/local-user";
import {
  updateCategory,
  deleteCategory,
} from "@/lib/services/category-management";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getLocalUserId();

  const { id } = await params;

  let body: { name?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name && !body.color) {
    return NextResponse.json(
      { error: "Provide at least name or color" },
      { status: 400 }
    );
  }

  try {
    const updated = await updateCategory(userId, id, body);
    return NextResponse.json({ category: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getLocalUserId();

  const { id } = await params;

  try {
    await deleteCategory(userId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
