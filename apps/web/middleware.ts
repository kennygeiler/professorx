import { NextResponse } from "next/server";

// No auth checks — single user local tool
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
