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
import { Shield, Zap, Upload, Hash, X } from "lucide-react";
import { ThreatInput, ThreatType } from "@/types/types";

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
  const [isGeneratingHash, setIsGeneratingHash] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

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

  // 🔥 COMPACT HASH GENERATOR
  const generateHash = async (file: File) => {
    setIsGeneratingHash(true);
    setError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setThreatData(hash);
      setUploadedFileName(file.name);

      setTimeout(() => {
        setError(`✅ Hash generated`);
      }, 100);
    } catch (err) {
      setError("Failed to generate hash");
    } finally {
      setIsGeneratingHash(false);
    }
  };

  // 🔥 DELETE UPLOAD
  const deleteUpload = () => {
    setThreatData("");
    setUploadedFileName(null);
    setError("");
  };

  const validateInput = (): boolean => {
    if (!threatData.trim()) {
      setError("Please enter threat data");
      return false;
    }
    if (threatType === "hash") {
      const hashRegex = /^[a-fA-F0-9]{32,64}$/;
      if (!hashRegex.test(threatData)) {
        setError("Invalid hash format");
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
  const showHashGenerator = threatType === "hash";

  return (
    <div className="bg-[#111] border border-[#1e3a8a]/30 rounded-lg p-6 space-y-6">
      {/* 🔥 MINIMALIST HASH UPLOAD - 1 LINE ONLY */}
      {showHashGenerator && (
        <div className="space-y-2">
          {uploadedFileName ? (
            // ✅ UPLOADED STATE (Tiny bar + delete)
            <div className="flex items-center justify-between bg-green-900/30 border border-green-500/30 rounded px-3 py-2">
              <div className="flex items-center gap-2">
                <Hash className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-300 truncate max-w-[200px]">
                  {uploadedFileName}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={deleteUpload}
                className="h-5 w-5 p-0 text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            // ⬆ UPLOAD STATE (Icon only)
            <label className="flex items-center justify-center w-full h-10 border-2 border-dashed border-[#1e3a8a]/50 rounded cursor-pointer bg-black hover:bg-[#1a1a2e] transition-colors">
              <Upload className="w-4 h-4 text-[#1e3a8a]" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) generateHash(file);
                }}
                accept="*/*"
                disabled={isGeneratingHash}
              />
            </label>
          )}
        </div>
      )}

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
            setUploadedFileName(null);
          }}
        >
          <SelectTrigger className="bg-black border-[#333] text-white focus:border-[#1e3a8a]">
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
            className="bg-black border-[#333] text-white placeholder:text-gray-600 focus:border-[#1e3a8a] font-mono"
            disabled={isLoading || isGeneratingHash}
          />
        )}
        {error && (
          <p
            className={`text-xs ${
              error.includes("✅") ? "text-green-400" : "text-red-400"
            }`}
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleDefend}
          disabled={isLoading || !threatData.trim() || isGeneratingHash}
          className="w-full bg-[#1e3a8a] hover:bg-[#2563eb] text-white disabled:opacity-50"
        >
          <Shield className="w-4 h-4 mr-2" />
          Defend
        </Button>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#065f46] via-[#10b981] to-[#065f46] rounded-lg blur-sm opacity-30 animate-pulse" />
          <Button
            onClick={onSimulate}
            disabled={isLoading || isGeneratingHash}
            className="relative w-full bg-gradient-to-r from-[#065f46] to-[#10b981] hover:from-[#10b981] hover:to-[#065f46] text-white transition-all duration-300"
          >
            <Zap className="w-4 h-4 mr-2" />
            Simulate Attack (3D)
          </Button>
        </div>
      </div>

      {/* 🔥 TINY TEST BUTTONS */}
      {showHashGenerator && (
        <div className="grid grid-cols-3 gap-1 pt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setThreatData("e99a18c42c83d5f2085367922e03")}
            className="h-6 text-xs p-0"
          >
            Clean
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setThreatData("44d88612fea8a8f36de82e1278abb02f")}
            className="h-6 text-xs p-0"
          >
            EICAR
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setThreatData("757c5e848e6b1e0d8e7d9c8f2a1b3c4d")}
            className="h-6 text-xs p-0"
          >
            Malware
          </Button>
        </div>
      )}
    </div>
  );
};