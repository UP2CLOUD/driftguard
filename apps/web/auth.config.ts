import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        if (account.provider === "developer-login") {
          token.accessToken = "mock_github_token";
        } else {
          token.accessToken = account.access_token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  providers: [], // populated in auth.ts
} satisfies NextAuthConfig;
