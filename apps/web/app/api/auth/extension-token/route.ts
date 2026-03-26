import { NextResponse } from "next/server";
import { requireAuth, createExtensionToken } from "@/lib/auth/utils";

export async function GET() {
  try {
    const user = await requireAuth();
    const token = await createExtensionToken(user.id!);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
