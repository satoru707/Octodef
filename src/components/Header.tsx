"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { OctoDefenderLogo } from "./OctoDefenderLogo";
import { usePathname } from "next/navigation";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<null | Session>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchSession() {
      const session = await getSession();
      setSession(session);
    }
    fetchSession();
  }, []);
  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const navLinks = !!session
    ? [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Profile", path: "/profile" },
        { name: "About", path: "/about" },
      ]
    : [
        { name: "About", path: "/about" },
        { name: "Sign In", path: "/auth/signin" },
      ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-[#1e3a8a]/20">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="group">
            <OctoDefenderLogo
              className="w-8 h-8"
              showText={true}
              animated={true}
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`text-sm transition-colors ${
                  pathname === link.path
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}
            {!!session && (
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="border-[#1e3a8a] text-white hover:bg-[#1e3a8a]/20"
              >
                Sign Out
              </Button>
            )}
          </div>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#1e3a8a]/20">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`block py-3 text-sm transition-colors ${
                  location.pathname === link.path
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            {!!session && (
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                variant="outline"
                className="w-full mt-4 border-[#1e3a8a] text-white hover:bg-[#1e3a8a]/20"
              >
                Sign Out
              </Button>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};
