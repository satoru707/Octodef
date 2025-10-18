import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Zap } from "lucide-react";
import { ThreatInput, ThreatType } from "@/lib/types";

interface ThreatInputFormProps {
  onDefend: (input: ThreatInput) => void;
  onSimulate: () => void;
  isLoading: boolean;
}

export const ThreatInputForm = ({
  onDefend,
  onSimulate,
  isLoading,
}: ThreatInputFormProps) => {
  const [threatType, setThreatType] = useState<ThreatType>("url");
  const [threatData, setThreatData] = useState("");
  const [error, setError] = useState("");

  const threatTypeLabels = {
    url: "URL",
    ip: "IP Address",
    hash: "File Hash",
    log: "Network Log (JSON)",
    email: "Email Header",
  };

  const placeholders = {
    url: "https://example.com/suspicious-link",
    ip: "192.168.1.100",
    hash: "e99a18c428cb38d5f260853678922e03",
    log: '{"event":"login_attempt","source":"192.168.1.50","timestamp":"2025-10-18T12:00:00Z"}',
    email:
      "From: sender@example.com\nTo: victim@company.com\nSubject: Urgent Action Required",
  };

  const validateInput = (): boolean => {
    if (!threatData.trim()) {
      setError("Please enter threat data");
      return false;
    }

    if (threatType === "url") {
      try {
        new URL(threatData);
      } catch {
        setError("Invalid URL format");
        return false;
      }
    }

    if (threatType === "ip") {
      const ipRegex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(threatData)) {
        setError("Invalid IP address format");
        return false;
      }
    }

    if (threatType === "hash") {
      const hashRegex = /^[a-fA-F0-9]{32,64}$/;
      if (!hashRegex.test(threatData)) {
        setError("Invalid hash format (MD5, SHA-1, or SHA-256)");
        return false;
      }
    }

    if (threatType === "log") {
      try {
        JSON.parse(threatData);
      } catch {
        setError("Invalid JSON format");
        return false;
      }
    }

    setError("");
    return true;
  };

  const handleDefend = () => {
    if (validateInput()) {
      onDefend({ type: threatType, data: threatData });
    }
  };

  const isMultiline = threatType === "log" || threatType === "email";

  return (
    <div className="bg-[#111] border border-[#1e3a8a]/30 rounded-lg p-6 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="threat-type" className="text-white">
          Threat Type
        </Label>
        <Select
          value={threatType}
          onValueChange={(value) => {
            setThreatType(value as ThreatType);
            setThreatData("");
            setError("");
          }}
        >
          <SelectTrigger
            id="threat-type"
            className="bg-black border-[#333] text-white focus:border-[#1e3a8a]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border-[#333]">
            {Object.entries(threatTypeLabels).map(([value, label]) => (
              <SelectItem
                key={value}
                value={value}
                className="text-white hover:bg-[#1e3a8a]/20"
              >
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="threat-data" className="text-white">
          {threatTypeLabels[threatType]} Data
        </Label>
        {isMultiline ? (
          <Textarea
            id="threat-data"
            value={threatData}
            onChange={(e) => {
              setThreatData(e.target.value);
              setError("");
            }}
            placeholder={placeholders[threatType]}
            className="bg-black border-[#333] text-white placeholder:text-gray-600 focus:border-[#1e3a8a] min-h-[120px] font-mono"
            disabled={isLoading}
          />
        ) : (
          <Input
            id="threat-data"
            value={threatData}
            onChange={(e) => {
              setThreatData(e.target.value);
              setError("");
            }}
            placeholder={placeholders[threatType]}
            className="bg-black border-[#333] text-white placeholder:text-gray-600 focus:border-[#1e3a8a]"
            disabled={isLoading}
          />
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleDefend}
          disabled={isLoading || !threatData.trim()}
          className="w-full bg-[#1e3a8a] hover:bg-[#2563eb] text-white disabled:opacity-50"
        >
          <Shield className="w-4 h-4 mr-2" />
          Defend
        </Button>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#065f46] via-[#10b981] to-[#065f46] rounded-lg blur-sm opacity-30 animate-pulse" />
          <Button
            onClick={onSimulate}
            disabled={isLoading}
            className="relative w-full bg-gradient-to-r from-[#065f46] to-[#10b981] hover:from-[#10b981] hover:to-[#065f46] text-white transition-all duration-300"
          >
            <Zap className="w-4 h-4 mr-2" />
            Simulate Attack (3D)
          </Button>
        </div>
      </div>
    </div>
  );
};
