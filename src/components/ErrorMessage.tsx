import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage = ({ message, onRetry }: ErrorMessageProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded-full p-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <div className="text-center">
        <h3 className="text-white mb-2">Something went wrong</h3>
        <p className="text-gray-400 max-w-md">{message}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-[#1e3a8a] text-white hover:bg-[#1e3a8a]/20"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
