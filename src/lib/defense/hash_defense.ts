export const runtime = "nodejs";

import * as crypto from "crypto";
import VirusTotal from "virustotal-api";
import * as fs from "fs/promises";
import { DefenseResult, AgentStatus } from "@/types/types";

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";
const vtClient = VT_API_KEY ? new VirusTotal(VT_API_KEY) : null;

export async function analyzeThreat(
  input: string | Buffer,
  inputType: "path" | "buffer" = "path"
): Promise<Omit<DefenseResult, "timestamp" | "_id">> {
  console.log(
    `Starting hash analysis for: ${
      typeof input === "string" ? input : "buffer"
    }`
  );

  const result: Omit<DefenseResult, "timestamp" | "_id"> = {
    input: {
      type: "hash",
      data: typeof input === "string" ? input : "[file buffer]",
    },
    overallRisk: 0,
    severity: "low",
    agents: [],
    findings: [],
    remediationSteps: [],
    threatMap: [],
    timeline: [],
    status: "processing",
  };

  addTimelineEvent(result, "Hash Analysis Started", "System");

  try {
    const fileHash = await runLocalHashAgent(result, input, inputType);
    await runVirusTotalAgent(result, fileHash);
    calculateFinalRisk(result);
    generateRemediationSteps(result);

    result.status = "complete";
    addTimelineEvent(result, "Hash Analysis Complete", "System");

    console.log("✅ Hash analysis completed successfully");
    return result;
  } catch (error: unknown) {
    console.error("❌ Hash analysis failed:", error);
    result.status = "failed";
    addTimelineEvent(
      result,
      `Analysis Failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "System"
    );

    result.overallRisk = 0;
    result.severity = "low";
    result.findings.push({
      agent: "System",
      type: "warning",
      message: "Hash analysis failed - marked as safe by default",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return result;
  }
}

async function runLocalHashAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  input: string | Buffer,
  inputType: "path" | "buffer"
): Promise<string> {
  const agentId = "local-hash";
  const agent: AgentStatus = {
    id: agentId,
    name: "Local SHA-256 Hash",
    description: "Generate SHA-256 hash using Node.js crypto",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Local hash generation started", agent.name);

  try {
    agent.progress = 30;

    let fileBuffer: Buffer;

    if (inputType === "path") {
      fileBuffer = await fs.readFile(input as string);
    } else {
      fileBuffer = input as Buffer;
    }

    agent.progress = 60;

    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);
    const fileHash = hash.digest("hex").toLowerCase();

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify({
      hash: fileHash,
      size: fileBuffer.length,
      type: inputType,
    });

    result.input.data = fileHash;
    result.findings.push({
      agent: agent.name,
      type: "info",
      message: "SHA-256 hash generated successfully",
      details: `Hash: ${fileHash} | Size: ${(fileBuffer.length / 1024).toFixed(
        1
      )} KB`,
    });

    addTimelineEvent(
      result,
      `Hash generated: ${fileHash.slice(0, 16)}...`,
      agent.name
    );

    return fileHash;
  } catch (error) {
    agent.status = "error";
    agent.result = `Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    result.findings.push({
      agent: agent.name,
      type: "critical",
      message: "Hash generation failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
}

async function runVirusTotalAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  fileHash: string
) {
  const agentId = "virustotal";
  const agent: AgentStatus = {
    id: agentId,
    name: "VirusTotal Hash Scan",
    description: "60+ antivirus engines hash verification",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "VirusTotal scan started", agent.name);

  if (!vtClient) {
    agent.progress = 100;
    agent.status = "error";
    agent.result = "No API key configured";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "VirusTotal skipped - no API key",
    });
    return;
  }

  try {
    agent.progress = 25;

    const vtResult = await vtClient.hashReport(fileHash);

    agent.progress = 75;
    if (vtResult.data.attributes.status === "queued") {
      await sleep(3000);
      const retryResult = await vtClient.hashReport(fileHash);
      vtResult.data = retryResult.data;
    }

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify(vtResult);

    const { last_analysis_stats, names } = vtResult.data.attributes;
    const positives = last_analysis_stats.malicious || 0;
    const total =
      last_analysis_stats.malicious + last_analysis_stats.harmless || 1;
    const detectionRate = ((positives / total) * 100).toFixed(1);

    const details = `Positives: ${positives}/${total} | Detection: ${detectionRate}% | Names: ${
      names?.join(", ") || "None"
    }`;

    if (positives > 0) {
      const riskBoost = Math.min(positives * 8, 80);
      result.overallRisk += riskBoost;

      const findingType = positives > 5 ? "critical" : "warning";
      result.findings.push({
        agent: agent.name,
        type: findingType,
        message: `File flagged by ${positives} engines`,
        details: details,
      });
      addTimelineEvent(result, `${positives} malware detections`, agent.name);
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "File clean by all engines",
        details,
      });
    }
  } catch (error: unknown) {
    agent.status = "error";
    agent.result = `API Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "VirusTotal hash check failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function calculateFinalRisk(result: Omit<DefenseResult, "timestamp" | "_id">) {
  result.overallRisk = Math.min(result.overallRisk, 100);

  if (result.overallRisk >= 80) result.severity = "critical";
  else if (result.overallRisk >= 60) result.severity = "high";
  else if (result.overallRisk >= 30) result.severity = "medium";
  else result.severity = "low";

  result.threatMap = [
    { category: "Local Hash", risk: 0, threats: 1 },
    {
      category: "VirusTotal Engines",
      risk: Math.min(result.overallRisk, 100),
      threats: result.overallRisk > 0 ? 1 : 0,
    },
  ];
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id">
) {
  const steps = [
    "1. Quarantine the file immediately",
    "2. Delete from all systems",
    "3. Scan entire environment",
  ];

  if (result.severity === "critical") {
    steps.push(
      "4. Notify security incident response team",
      "5. Submit sample to research"
    );
  }

  result.remediationSteps = steps;
}

function addTimelineEvent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  event: string,
  agent: string
) {
  result.timeline.push({
    time: new Date().toISOString(),
    agent,
    event,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
