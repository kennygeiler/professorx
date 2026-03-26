import { auth } from "@/lib/auth/config";
import { jwtVerify, SignJWT } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""
);

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function createExtensionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function validateExtensionToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}
