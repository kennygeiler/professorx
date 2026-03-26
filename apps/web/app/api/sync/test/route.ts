import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string | undefined;
  const twitterId = (session as any).twitterId as string | undefined;

  if (!accessToken || !twitterId) {
    return NextResponse.json({ error: "Missing token or twitterId" }, { status: 401 });
  }

  // Just test the Twitter API call — fetch 10 likes, don't save
  try {
    const url = `https://api.x.com/2/users/${twitterId}/liked_tweets?max_results=10&tweet.fields=created_at,text`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const status = res.status;
    const body = await res.text();

    return NextResponse.json({
      twitterApiStatus: status,
      twitterResponse: body.slice(0, 1000),
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
