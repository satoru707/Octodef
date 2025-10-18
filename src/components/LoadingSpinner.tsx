import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner = ({ message = 'Loading...' }: LoadingSpinnerProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Loader2 className="w-12 h-12 text-[#1e3a8a] animate-spin" />
      <p className="text-gray-400">{message}</p>
    </div>
  );
};
