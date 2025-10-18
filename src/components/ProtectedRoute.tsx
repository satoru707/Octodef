import { ReactNode } from "react";
import Link from "next/link";
import { getSession } from "../lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const session = getSession();

  if (!session) {
    return <Link href="/auth/signin" replace />;
  }

  return <>{children}</>;
};
