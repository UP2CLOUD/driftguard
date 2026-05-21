import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_SECRET,
      authorization: {
        params: {
          // read:org lets us list org memberships — but NOT /user/installations
          // (that endpoint requires GitHub App user-to-server tokens, not OAuth tokens)
          scope: "read:org,repo,user",
        },
      },
    }),
    Credentials({
      id: "developer-login",
      name: "Developer Bypass",
      credentials: {},
      async authorize() {
        return {
          id: "999",
          name: "Developer Bypass",
          email: "developer@driftguard.dev",
          image: "https://github.com/github.png",
          login: "dev-bypass",
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = profile?.id?.toString() ?? account.providerAccountId;
        // Store GitHub login (username) — used to look up orgs in our DB
        token.login = (profile as any)?.login ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.accessToken = token.accessToken as string;
      session.user.login = (token.login as string) ?? "";
      return session;
    },
  },
});
