"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsCard } from "@/components/ResultsCard";
import { ThreatGraph } from "@/components/ThreatGraph";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useSessionDetails } from "../lib/defenseQueries";

export const SessionDetailPage = ({ id }: { id: string }) => {
  const router = useRouter();
  const { data: result, isLoading, error, refetch } = useSessionDetails(id);

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl text-white mb-2">Session Details</h1>
          <p className="text-gray-400">View complete threat analysis report</p>
        </div>

        {isLoading && (
          <div className="bg-[#111] border border-[#1e3a8a]/30 rounded-lg p-12">
            <LoadingSpinner message="Loading session details..." />
          </div>
        )}

        {error && (
          <div className="bg-[#111] border border-[#1e3a8a]/30 rounded-lg p-12">
            <ErrorMessage
              message="Failed to load session details"
              onRetry={() => refetch()}
            />
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ResultsCard result={result} />
            </div>
            <div className="lg:col-span-1">
              <ThreatGraph data={result.threatMap} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetailPage;