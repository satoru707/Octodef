export const runtime = "nodejs";

import {
  AbuseIPDBClient,
  ClientResponse,
  APICheckEndpointResponse,
} from "abuseipdb-client";
import {
  DefenseResult,
  AgentStatus,
  Finding,
  ThreatMapData,
  TimelineEvent,
} from "@/types/types";
import countriesData from "@/lib/data/country.json" assert { type: "json" };

const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY || "";
const abuseClient = ABUSEIPDB_API_KEY
  ? new AbuseIPDBClient(ABUSEIPDB_API_KEY)
  : null;

export async function analyzeThreat(
  input: string
): Promise<Omit<DefenseResult, "timestamp" | "_id" | "userId">> {
  const result: Omit<DefenseResult, "timestamp" | "_id" | "userId"> = {
    input: { type: "ip", data: input },
    overallRisk: 0,
    severity: "low",
    agents: [],
    findings: [] as Finding[],
    remediationSteps: [],
    threatMap: [] as ThreatMapData[],
    timeline: [] as TimelineEvent[],
    status: "processing",
  };
  addTimelineEvent(result, "IP Analysis Started", "System");

  try {
    await Promise.all([
      runGeoIPAgent(result, input),
      runAbuseIPDBAgent(result, input),
    ]);
    calculateFinalRisk(result);
    generateRemediationSteps(result);
    result.status = "complete";
    addTimelineEvent(result, "IP Analysis Complete", "System");
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
      message: "IP analysis failed - marked as safe by default",
      details: error instanceof Error ? error.message : "Unknown error",
    });

    return result;
  }
}

async function runGeoIPAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agentId = "geoip-json";
  const agent: AgentStatus = {
    id: agentId,
    name: "GeoIP JSON Database",
    description: "1ms instant country lookup (500+ IPs)",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "JSON GeoIP started", agent.name);

  try {
    agent.progress = 100;

    let countryCode = "UNKNOWN";
    for (const [code, ips] of Object.entries(countriesData)) {
      if (ips.includes(input)) {
        countryCode = code;
        break;
      }
    }
    agent.status = "complete";
    agent.result = JSON.stringify({ country: countryCode });

    const details = `Country: ${countryCode}`;
    result.findings.push({
      agent: agent.name,
      type: "info" as const,
      message: "IP country resolved instantly",
      details,
    });
    addTimelineEvent(result, `Country: ${countryCode}`, agent.name);

    const highRiskCountries = ["RU", "CN", "KP", "IR", "SY"];
    if (highRiskCountries.includes(countryCode)) {
      result.overallRisk += 20;
      result.findings.push({
        agent: agent.name,
        type: "warning" as const,
        message: "IP from high-risk country",
        details: `Country code: ${countryCode}`,
      });
    }
  } catch (error) {
    agent.status = "error";
    agent.result = `Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: "JSON GeoIP failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runAbuseIPDBAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agentId = "abuseipdb";
  const agent: AgentStatus = {
    id: agentId,
    name: "AbuseIPDB Reputation",
    description: "Live abuse reports",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Reputation check started", agent.name);

  if (!abuseClient) {
    agent.progress = 100;
    agent.status = "error";
    agent.result = "No API key configured";
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: "AbuseIPDB skipped - no API key",
    });
    return;
  }

  try {
    agent.progress = 50;

    const response: ClientResponse<APICheckEndpointResponse> =
      await abuseClient.check(input, { maxAgeInDays: 90 });

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify(response);

    if (!response.result) {
      result.findings.push({
        agent: agent.name,
        type: "warning" as const,
        message: "AbuseIPDB check failed",
      });
      return;
    }

    const { abuseConfidenceScore, totalReports, reports } =
      response.result.data || {};

    const categoryNumbers =
      reports?.flatMap((report) => report.categories) || [];
    const categoryNames = parseAbuseCategories(categoryNumbers);

    const details = `Confidence: ${abuseConfidenceScore}%, Reports: ${totalReports}`;

    if (abuseConfidenceScore > 0) {
      const riskBoost = Math.min(abuseConfidenceScore, 80);
      result.overallRisk += riskBoost;

      const findingType =
        abuseConfidenceScore > 50
          ? ("critical" as const)
          : ("warning" as const);
      result.findings.push({
        agent: agent.name,
        type: findingType,
        message: `IP has abuse history (${abuseConfidenceScore}%)`,
        details: `${details}. Categories: ${
          categoryNames.join(", ") || "None"
        }`,
      });
      addTimelineEvent(result, `${totalReports} abuse reports`, agent.name);
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info" as const,
        message: `IP clean (${totalReports || 0} reports)`,
        details,
      });
    }
  } catch (error: unknown) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = `Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: "AbuseIPDB failed",
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
      category: "GeoIP Location",
      risk: Math.min(result.overallRisk * 0.3, 30),
      threats: 1,
    },
    {
      category: "Abuse Reports",
      risk: Math.min(result.overallRisk * 0.7, 70),
      threats: result.overallRisk > 0 ? 1 : 0,
    },
  ];
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  const steps = [
    "1. Block IP at firewall level",
    "2. Monitor network traffic from this IP",
    "3. Investigate related logs",
  ];

  if (result.severity === "critical") {
    steps.push("4. Immediate quarantine", "5. Report to ISP");
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

function parseAbuseCategories(categories: number[]): string[] {
  const catMap: { [key: number]: string } = {
    10: "Abuse service",
    11: "Email spam",
    12: "Attack services",
    14: "Web spam",
    18: "Internet scanner",
    19: "Phishing",
    20: "Port scan",
    21: "Exploit",
    22: "Brute-force",
    23: "DDoS attack",
    24: "Malware",
  };
  return categories.map((cat) => catMap[cat] || `Category ${cat}`);
}

export default analyzeThreat;