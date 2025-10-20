import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Twitter from "next-auth/providers/twitter";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db";
import { User, Session } from "next-auth";

interface ExtendedUser extends User {
  provider?: string;
}

export interface ExtendedSession extends Session {
  provider?: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && profile?.email) {
        const db = (await clientPromise).db("octodef");
        const existingUser = await db.collection("users").findOne({ email: profile.email });
        if (existingUser) {
          if (existingUser.provider && existingUser.provider !== account.provider) {
            return false; 
          }
          (user as ExtendedUser).provider = account.provider;
          await db.collection("users").updateOne(
            { email: profile.email },
            { $set: { provider: account.provider } }
          );
        } else {
          (user as ExtendedUser).provider = account.provider;
          user.email = profile.email;
        }
      }
      return true;
    },
    async jwt({ token, account, isNewUser }) {
      if (account) {
        token.provider = account.provider;
        token.accessToken = account.access_token;
      } else if (!token.provider && isNewUser) {
        if ((token).sub) {
          token.provider = "unknown";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.provider) {
        (session as ExtendedSession).provider = token.provider as string
      } else {
      
        if (session.user && (session.user as ExtendedUser).provider) {
          (session as ExtendedSession).provider = (session.user as ExtendedUser).provider;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});