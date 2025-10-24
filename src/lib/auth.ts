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

const getAdapter = () => {
  if (process.env.NODE_ENV === "production") {
    return MongoDBAdapter(clientPromise);
  }
  return undefined;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: getAdapter(),
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
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || process.env.NODE_ENV !== "production") return true;

      try {
        const db = (await clientPromise).db("octodef");
        const users = db.collection("users");

        const provider = account.provider;
        const providerAccountId = account.providerAccountId || profile?.id;
        const userEmail =
          profile?.email ||
          (provider === "twitter"
            ? `twitter_${providerAccountId}@twitter.com`
            : null);
        const displayName = profile?.name || user.name || "Unknown User";
        const avatar = profile?.image || user.image || null;

        const existingUser = await users.findOne({ email: userEmail });

        if (existingUser) {
          const updates: Partial<User> = {};
          if (displayName && displayName !== existingUser.name)
            updates.name = displayName;
          if (avatar && avatar !== existingUser.image)
            updates.image = avatar as string;
          if (Object.keys(updates).length > 0)
            await users.updateOne({ email: userEmail }, { $set: updates });

          (user as ExtendedUser).provider = provider;
          user.email = existingUser.email;
        } else {
          await users.insertOne({
            name: displayName,
            image: avatar,
            email: userEmail,
            provider,
            createdAt: new Date(),
          });
          (user as ExtendedUser).provider = provider;
          user.email = userEmail;
        }
      } catch (error) {
        console.error("SignIn callback error:", error);
      }

      return true;
    },

    async jwt({ token, account }) {
      if (account) token.provider = account.provider;
      return token;
    },

    async session({ session, token }) {
      if (token?.provider)
        (session as ExtendedSession).provider = token.provider as string;

      if (!session.user?.email && process.env.NODE_ENV === "production") {
        try {
          const db = (await clientPromise).db("octodef");
          const users = db.collection("users");
          const foundUser = await users.findOne({
            name: session.user?.name,
            provider: (session as ExtendedSession).provider,
          });
          if (foundUser?.email) session.user.email = foundUser.email;
        } catch (error) {
          console.error("Session callback error:", error);
        }
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
