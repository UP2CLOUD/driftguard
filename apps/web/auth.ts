import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
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
        };
      },
    }),
  ],
});
