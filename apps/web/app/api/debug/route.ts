import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not logged in" });
  }

  return NextResponse.json({
    userId: session.user?.id,
    name: session.user?.name,
    hasAccessToken: !!(session as any).accessToken,
    accessTokenPrefix: (session as any).accessToken?.slice(0, 20) + "...",
    twitterId: (session as any).twitterId,
  });
}
