"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <div className="text-[#dc2626] text-9xl mb-4">500</div>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#dc2626]/20 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-[#dc2626]" />
          </div>
        </div>

        <h1 className="text-4xl text-white mb-4">Something Went Wrong</h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
          An unexpected error occurred. Our defense systems are on it — please
          try again or return home safely.
        </p>

        <div className="flex justify-center gap-4">
          <Button
            onClick={() => reset()}
            className="bg-[#dc2626] hover:bg-[#ef4444] text-white"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          <Button
            asChild
            className="bg-[#1e3a8a] hover:bg-[#2563eb] text-white"
          >
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
