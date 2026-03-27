import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.API_KEY ?? "";
  return NextResponse.json({ apiKey });
}
