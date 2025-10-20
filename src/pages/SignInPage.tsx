"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, getSession } from "next-auth/react";
import { toast } from "sonner";
import { SiGoogle, SiGithub, SiX } from "react-icons/si";
import { OctoDefenderLogo } from "@/components/OctoDefenderLogo";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<"google" | "github" | "twitter">("google");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !searchParams) return;

    const error = searchParams.get("error");
    if (!error) return;

    switch (error) {
      case "OAuthAccountNotLinked":
        toast.error(
          "This email is already linked with another provider. Please use your original login method."
        );
        break;
      case "Configuration":
        toast.error("There was a configuration issue with authentication.");
        break;
      case "AccessDenied":
        toast.error("Access denied. Please try a different provider.");
        break;
      case "Verification":
        toast.error("Email verification failed.");
        break;
      default:
        toast.error("Sign-in failed. Please try again.");
        break;
    }
  }, [searchParams, isClient]);

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
            <div className="flex justify-center mb-6">
              <OctoDefenderLogo
                className="w-24 h-24"
                showText={false}
                animated={true}
              />
            </div>
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
            {isLoading && provider === "google" ? (
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
            {isLoading && provider === "github" ? (
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
            {isLoading && provider === "twitter" ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <>
                <SiX className="w-5 h-5 mr-3" />
                Continue with Twitter
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
