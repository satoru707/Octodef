import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Twitter from "next-auth/providers/twitter";

let currentSession: Session | null = null;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google, GitHub, Twitter],
});

export const getSession = async (): Promise<Session | null> => {
  if (currentSession) return currentSession;

  currentSession = await auth();
  if (!currentSession?.user) return null;
  console.log("session structure", currentSession);
  return currentSession;
};

export const useAuth = async () => {
  const session = await getSession();
  return {
    user: session?.user ?? null,
    isAuthenticated: !!session,
  };
};
