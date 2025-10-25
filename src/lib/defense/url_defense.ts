export const runtime = "nodejs";

import { DefenseResult, AgentStatus } from "@/types/types";

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY! || "";
const GOOGLE_SAFE_BROWSING_API_KEY =
  process.env.GOOGLE_SAFE_BROWSING_API_KEY! || "";

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
    await runGoogleSafeBrowsingAgent(result, input);
    await runVirusTotalV3Agent(result, input);

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

async function runGoogleSafeBrowsingAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agentId = "gsb-v5";
  const agent: AgentStatus = {
    id: agentId,
    name: "Google Safe Browsing v5",
    description: "AI-powered threat detection for phishing, malware & scams",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Google Safe Browsing started", agent.name);

  if (!GOOGLE_SAFE_BROWSING_API_KEY) {
    agent.progress = 100;
    agent.status = "error";
    agent.result = "No API key configured";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "Google Safe Browsing skipped - no API key",
    });
    return;
  }

  const body = {
    client: { clientId: "defender-app", clientVersion: "1.5.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url: input }],
    },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      agent.progress = attempt === 0 ? 30 : 30 + attempt * 20;
      const res = await fetch(
        `https://safebrowsing.googleapis.com/v5/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const text = await res.text().catch(() => "");
      if (!text || text.trim().length === 0) {
        agent.progress = 100;
        agent.status = "complete";
        agent.result = "No matches (empty response)";
        result.findings.push({
          agent: agent.name,
          type: "info",
          message:
            "No threat detected by Google Safe Browsing (empty response)",
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        agent.progress = 100;
        agent.status = "error";
        agent.result = `Parse Error: ${String(parseErr)} | raw=${text.slice(
          0,
          1000
        )}`;
        result.findings.push({
          agent: agent.name,
          type: "warning",
          message: "Google Safe Browsing returned non-JSON or malformed JSON",
          details: String(parseErr),
        });
        return;
      }

      agent.progress = 100;
      agent.status = "complete";
      agent.result = JSON.stringify(data);

      const isMalicious = data?.matches && data.matches.length > 0;
      if (isMalicious) {
        result.overallRisk += 45;
        result.findings.push({
          agent: agent.name,
          type: "critical",
          message: "Google flagged this URL as unsafe",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          details: data.matches.map((m: any) => m.threatType).join(", "),
        });
        addTimelineEvent(result, "Threat detected by Google", agent.name);
      } else {
        result.findings.push({
          agent: agent.name,
          type: "info",
          message: "No threat detected by Google Safe Browsing",
        });
      }
      return;
    } catch (err: unknown) {
      const statusIsRetryable =
        (err instanceof Error &&
          /ECONNRESET|ETIMEDOUT|EAI_AGAIN/.test(err.message)) ||
        attempt < 2;
      agent.status = "error";
      agent.result = `Network/Error: ${
        err instanceof Error ? err.message : String(err)
      }`;
      if (!statusIsRetryable) {
        result.findings.push({
          agent: agent.name,
          type: "warning",
          message: "Google Safe Browsing failed",
          details: err instanceof Error ? err.message : String(err),
        });
        agent.progress = 100;
        return;
      }
      continue;
    }
  }
}

async function runVirusTotalV3Agent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agentId = "vt-v3";
  const agent: AgentStatus = {
    id: agentId,
    name: "VirusTotal v3 Cloud",
    description: "60+ antivirus engines threat correlation",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "VirusTotal v3 analysis started", agent.name);

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
    agent.progress = 30;

    const encodedUrl = Buffer.from(input).toString("base64url");
    const reportResponse = await fetch(
      `https://www.virustotal.com/api/v3/urls/${encodedUrl}`,
      { headers: { "x-apikey": VT_API_KEY } }
    );
    const text = await reportResponse.text().catch(() => "");
    if (!text || text.trim().length === 0) {
      agent.progress = 100;
      agent.status = "complete";
      agent.result = "Empty VT response";
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "VirusTotal returned empty response",
      });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let vtResult: any;
    try {
      vtResult = JSON.parse(text);
    } catch (parseErr) {
      agent.progress = 100;
      agent.status = "error";
      agent.result = `VT parse error: ${String(parseErr)} | raw=${text.slice(
        0,
        1000
      )}`;
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "VirusTotal returned malformed JSON",
        details: String(parseErr),
      });
      return;
    }

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify(vtResult);

    const stats = vtResult.data?.attributes?.last_analysis_stats ?? {};
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const harmless = stats.harmless || 0;
    const total = Object.values(stats).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: number, b: any) => a + (typeof b === "number" ? b : 0),
      0
    );
    const detectionRatio = total ? (malicious + suspicious) / total : 0;

    if (malicious > 0 || suspicious > 0) {
      const impact = Math.min(Math.round(detectionRatio * 100), 100);
      result.overallRisk += Math.min(impact, 55);

      result.findings.push({
        agent: agent.name,
        type: malicious > 3 ? "critical" : "warning",
        message: `${malicious} malicious, ${suspicious} suspicious out of ${total} scanners`,
        details: vtResult.data?.links?.self || "Detailed report available",
      });

      addTimelineEvent(
        result,
        `${malicious} malicious reports found`,
        agent.name
      );
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: `Clean — ${harmless}/${total} engines marked safe`,
      });
    }
  } catch (err: unknown) {
    agent.status = "error";
    agent.result = `API Error: ${
      err instanceof Error ? err.message : "Unknown error"
    }`;
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "VirusTotal API failed",
      details: err instanceof Error ? err.message : "Unknown error",
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
      category: "Google Safe Browsing",
      risk: Math.min(result.overallRisk * 0.4, 40),
      threats: result.overallRisk > 0 ? 1 : 0,
    },
    {
      category: "VirusTotal Engines",
      risk: Math.min(result.overallRisk * 0.6, 60),
      threats: result.overallRisk > 0 ? 1 : 0,
    },
  ];
}
function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  const steps = ["1. Block access to flagged URLs", "2. Clear browser cache"];

  if (result.severity === "critical") {
    steps.push(
      "3. Quarantine affected systems",
      "4. Notify IT/security team immediately",
      "5. Scan for credential compromise"
    );
  } else if (result.severity === "high") {
    steps.push("3. Avoid visiting the URL", "4. Monitor network traffic");
  } else {
    steps.push("3. No immediate action needed");
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
  