export const runtime = "nodejs";

import { DefenseResult, AgentStatus, Finding } from "@/types/types";

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";

export async function analyzeThreat(
  input: string
): Promise<Omit<DefenseResult, "timestamp" | "_id">> {
  console.time("HASH_ANALYSIS_SPEED");

  console.log(`🔍 Analyzing hash: ${input}`);

  const result: Omit<DefenseResult, "timestamp" | "_id"> = {
    input: {
      type: "hash",
      data: input,
    },
    overallRisk: 0,
    severity: "low",
    agents: [],
    findings: [] as Finding[],
    remediationSteps: [],
    threatMap: [],
    timeline: [],
    status: "processing",
  };

  addTimelineEvent(result, "Hash Analysis Started", "System");

  try {
    await runVirusTotalAgent(result, input);
    calculateFinalRisk(result);
    generateRemediationSteps(result);
    result.status = "complete";
    addTimelineEvent(result, "Hash Analysis Complete", "System");
    return result;
  } catch (error: unknown) {
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
      type: "warning" as const,
      message: "Hash analysis failed - marked as safe by default",
      details: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

async function runVirusTotalAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  fileHash: string
) {
  const agentId = "virustotal";
  const agent: AgentStatus = {
    id: agentId,
    name: "VirusTotal Intelligence",
    description: "95+ engines + reputation + behavior analysis",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "VirusTotal scan started", agent.name);

  if (!VT_API_KEY) {
    agent.progress = 100;
    agent.status = "error";
    agent.result = "No API key configured";
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: "VirusTotal skipped - no API key",
      details: "Add VIRUSTOTAL_API_KEY to .env",
    });
    return;
  }

  try {
    agent.progress = 50;
    const response = await fetch(
      `https://www.virustotal.com/vtapi/v2/file/report?apikey=${VT_API_KEY}&resource=${fileHash}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const vtResult = await response.json();
    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify(vtResult);
    const positives = vtResult.positives || 0;
    const total = vtResult.total || 1;
    const scanDate = vtResult.scan_date || "Unknown";
    const permalink = vtResult.permalink || "";
    const detectionRate = ((positives / total) * 100).toFixed(1);

    const scans = vtResult.scans || {};
    const engineDetections = Object.entries(scans)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, result]) => (result as { detected: boolean }).detected)
      .map(([engine]) => engine)
      .slice(0, 5);

    const details = [
      `Detection: ${positives}/${total} (${detectionRate}%)`,
      `Scan date: ${scanDate}`,
      `Engines: ${engineDetections.join(", ") || "None"}`,
      `Permalink: ${permalink ? "Available" : "None"}`,
    ].join(" | ");

    const riskBoost = Math.min(positives * 10, 95);
    result.overallRisk += riskBoost;

    if (positives > 0) {
      const findingType = positives > 3 ? "critical" : "warning";

      result.findings.push({
        agent: agent.name,
        type: findingType,
        message: `${positives} engines flagged this hash`,
        details: details,
      });

      addTimelineEvent(result, `${positives} detections`, agent.name);
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info" as const,
        message: `Clean hash (${positives}/${total})`,
        details: details,
      });
    }
  } catch (error: unknown) {
    agent.status = "error";
    agent.result = `Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: "VirusTotal lookup failed",
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
    {
      category: "VirusTotal Intelligence",
      risk: result.overallRisk,
      threats: result.overallRisk > 0 ? 1 : 0,
    },
  ];
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id">
) {
  const steps = [
    "1. BLOCK this hash immediately",
    "2. Scan all systems for matching files",
    "3. Quarantine any matches",
  ];

  if (result.severity === "critical") {
    steps.push(
      "4. Notify incident response team NOW",
      "5. Submit to threat intelligence",
      "6. Update all security signatures"
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