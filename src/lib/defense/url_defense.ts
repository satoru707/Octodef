export const runtime = "nodejs";

import { DefenseResult, AgentStatus } from "@/types/types";

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";
const GOOGLE_SAFE_BROWSING_API_KEY =
  process.env.GOOGLE_SAFE_BROWSING_API_KEY || "";

export async function analyzeThreat(
  input: string
): Promise<Omit<DefenseResult, "timestamp" | "_id" | "userId">> {
  const result: Omit<DefenseResult, "timestamp" | "_id" | "userId"> = {
    input: { type: "url", data: input },
    overallRisk: 0,
    severity: "low",
    agents: [],
    findings: [],
    remediationSteps: [],
    threatMap: [],
    timeline: [],
    status: "processing",
  };

  addTimelineEvent(result, "Analysis Started", "System");

  try {
    await runLocalDetectorAgent(result, input);
    await runVirusTotalAgent(result, input);
    calculateFinalRisk(result);
    generateRemediationSteps(result);
    result.status = "complete";
    addTimelineEvent(result, "Analysis Complete", "System");
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
      type: "warning",
      message: "Analysis failed - input marked as safe by default",
      details: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

async function runLocalDetectorAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agentId = "local-detector";
  const agent: AgentStatus = {
    id: agentId,
    name: "Google Safe Browsing API",
    description: "Direct Google Safe Browsing lookup",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Google Safe Browsing started", agent.name);

  if (!GOOGLE_SAFE_BROWSING_API_KEY) {
    agent.progress = 100;
    agent.status = "error";
    agent.result = "No Google API key configured";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "Google Safe Browsing skipped - no API key",
    });
    return;
  }

  try {
    agent.progress = 50;

    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "yourcompany", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: input }],
          },
        }),
      }
    );

    const data = await response.json();
    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify(data);

    const isMalicious = data.matches && data.matches.length > 0;

    if (isMalicious) {
      result.overallRisk += 40;
      result.findings.push({
        agent: agent.name,
        type: "critical",
        message: "Malicious URL detected by Google",
        details: `Threat type: ${data.matches[0].threatType}`,
      });
      addTimelineEvent(result, "Malicious URL found", agent.name);
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "URL clean (Google Safe Browsing)",
      });
    }
  } catch (error) {
    agent.status = "error";
    agent.result = `Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "Google Safe Browsing failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runVirusTotalAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agentId = "virustotal";
  const agent: AgentStatus = {
    id: agentId,
    name: "VirusTotal Cloud",
    description: "60+ antivirus engines cloud scan",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Cloud scan started", agent.name);

  if (!VT_API_KEY) {
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
    const reportResponse = await fetch(
      `https://www.virustotal.com/vtapi/v2/url/report?apikey=${VT_API_KEY}&resource=${encodeURIComponent(
        input
      )}`
    );
    const vtResult = await reportResponse.json();
    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify(vtResult);

    const positives = vtResult.positives || 0;
    const total = vtResult.total || 0;

    if (positives > 0) {
      const detectionRate = total > 0 ? (positives / total) * 100 : 0;
      result.overallRisk += Math.min(positives * 10, 60);

      result.findings.push({
        agent: agent.name,
        type: positives > 5 ? "critical" : "warning",
        message: `${positives}/${total} engines flagged as malicious`,
        details: `Detection rate: ${detectionRate.toFixed(1)}%`,
      });
      addTimelineEvent(result, `${positives} threats detected`, agent.name);
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: `Clean by all ${total} engines`,
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
      message: "VirusTotal API failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function calculateFinalRisk(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  result.overallRisk = Math.min(result.overallRisk, 100);
  if (result.overallRisk >= 80) result.severity = "critical";
  else if (result.overallRisk >= 60) result.severity = "high";
  else if (result.overallRisk >= 30) result.severity = "medium";
  else result.severity = "low";

  result.threatMap = [
    {
      category: "Local Detection",
      risk: Math.min(result.overallRisk * 0.4, 40),
      threats: 1,
    },
    {
      category: "Cloud Engines",
      risk: Math.min(result.overallRisk * 0.6, 60),
      threats: result.overallRisk > 0 ? 1 : 0,
    },
  ];
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  const steps = [
    "1. Block access to flagged URLs",
    "2. Update security signatures",
    "3. Run full system scan",
  ];
  if (result.severity === "critical") {
    steps.push("4. Immediate quarantine", "5. Notify security team");
  }
  result.remediationSteps = steps;
}

function addTimelineEvent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  event: string,
  agent: string
) {
  result.timeline.push({
    time: new Date().toISOString(),
    agent,
    event,
  });
}
