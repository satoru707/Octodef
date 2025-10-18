import { AlertTriangle, Info, Download, Share2 } from "lucide-react";
import { DefenseResult } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ResultsCardProps {
  result: DefenseResult;
}

export const ResultsCard = ({ result }: ResultsCardProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="w-4 h-4" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `defense-report-${result.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/session/${result.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Overall Risk Score */}
      <Card className="bg-[#111] border-[#1e3a8a]/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white">
                Defense Analysis Complete
              </CardTitle>
              <CardDescription className="text-gray-400">
                {new Date(result.timestamp).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyShareLink}
                className="border-[#333] text-white hover:bg-[#1e3a8a]/20"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportJSON}
                className="border-[#333] text-white hover:bg-[#1e3a8a]/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Overall Risk Score</p>
              <p className="text-4xl text-white">{result.overallRisk}</p>
            </div>
            <Badge className={getSeverityColor(result.severity)}>
              {result.severity.toUpperCase()}
            </Badge>
          </div>

          <div className="bg-black rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-400">Threat Type</p>
            <p className="text-white">{result.input.type.toUpperCase()}</p>
            <p className="text-sm text-gray-500 break-all font-mono">
              {result.input.data}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Findings */}
      <Card className="bg-[#111] border-[#1e3a8a]/30">
        <CardHeader>
          <CardTitle className="text-white">Key Findings</CardTitle>
          <CardDescription className="text-gray-400">
            Critical insights from agent analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.findings.map((finding, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                finding.type === "critical"
                  ? "bg-red-500/10 border-red-500/30"
                  : finding.type === "warning"
                  ? "bg-yellow-500/10 border-yellow-500/30"
                  : "bg-[#1e3a8a]/10 border-[#1e3a8a]/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 mt-0.5 ${
                    finding.type === "critical"
                      ? "text-red-400"
                      : finding.type === "warning"
                      ? "text-yellow-400"
                      : "text-[#1e3a8a]"
                  }`}
                >
                  {getTypeIcon(finding.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-400 mb-1">{finding.agent}</p>
                  <p className="text-white">{finding.message}</p>
                  {finding.details && (
                    <p className="text-sm text-gray-400 mt-2">
                      {finding.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Remediation Steps */}
      <Card className="bg-[#111] border-[#1e3a8a]/30">
        <CardHeader>
          <CardTitle className="text-white">Remediation Steps</CardTitle>
          <CardDescription className="text-gray-400">
            Recommended actions to mitigate threats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {result.remediationSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-sm">
                  {idx + 1}
                </span>
                <p className="text-gray-300 flex-1 pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
