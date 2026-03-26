import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "1.0",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn() {
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
  debug: true,
  session: {
    strategy: "jwt",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuth = NextAuth(authConfig) as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handlers: any = nextAuth.handlers;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = nextAuth.auth;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signIn: any = nextAuth.signIn;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut: any = nextAuth.signOut;
