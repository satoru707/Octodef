"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, getSession } from "next-auth/react";
import { toast } from "sonner";
import { SiGoogle, SiGithub, SiX } from "react-icons/si";

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<"google" | "github" | "twitter">(
    "google"
  );

  useEffect(() => {
    const verifySession = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Session check failed:", err);
      }
    };
    verifySession();
  }, [router]);

  const handleSignIn = async (provider: "google" | "github" | "twitter") => {
    try {
      setProvider(provider);
      setIsLoading(true);
      await signIn(provider, { redirectTo: "/dashboard" });
      toast.success(`Redirecting...`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1e3a8a]/20 rounded-full mb-4">
            <Shield className="w-8 h-8 text-[#1e3a8a]" />
          </div>
          <h1 className="text-3xl text-white mb-2">Welcome to OctoDefender</h1>
          <p className="text-gray-400">
            Sign in to access your defense dashboard
          </p>
        </div>

        <div className="bg-[#111] border border-[#1e3a8a]/30 rounded-lg p-8 space-y-4">
          <Button
            onClick={() => handleSignIn("google")}
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-100 text-black h-12 flex items-center justify-center"
          >
            {isLoading && provider == "google" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <>
                <SiGoogle className="w-5 h-5 mr-3" />
                Continue with Google
              </>
            )}
          </Button>

          <Button
            onClick={() => handleSignIn("github")}
            disabled={isLoading}
            className="w-full bg-[#24292e] hover:bg-[#1a1e22] text-white h-12 flex items-center justify-center"
          >
            {isLoading && provider == "github" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <>
                <SiGithub className="w-5 h-5 mr-3" />
                Continue with GitHub
              </>
            )}
          </Button>

          <Button
            onClick={() => handleSignIn("twitter")}
            disabled={isLoading}
            className="w-full bg-[#1DA1F2] hover:bg-[#1991da] text-white h-12 flex items-center justify-center"
          >
            {isLoading && provider == "twitter" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <>
                <SiX className="w-5 h-5 mr-3" />
                Continue with Twitter
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center pt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
