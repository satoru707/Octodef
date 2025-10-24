import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <div className="text-[#1e3a8a] text-9xl mb-4">404</div>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1e3a8a]/20 rounded-full mb-4">
            <Search className="w-8 h-8 text-[#1e3a8a]" />
          </div>
        </div>

        <h1 className="text-4xl text-white mb-4">Page Not Found</h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved
          to a secure location.
        </p>

        <Button asChild className="bg-[#1e3a8a] hover:bg-[#2563eb] text-white">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
