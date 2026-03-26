import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "tweet.read users.read like.read bookmark.read offline.access",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.id) return false;
      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuth: any = NextAuth(authConfig);

export const handlers: { GET: typeof import("next/server").NextRequest; POST: typeof import("next/server").NextRequest } = nextAuth.handlers;
export const auth: () => Promise<import("next-auth").Session | null> = nextAuth.auth;
export const signIn: (...args: unknown[]) => Promise<unknown> = nextAuth.signIn;
export const signOut: (...args: unknown[]) => Promise<unknown> = nextAuth.signOut;
