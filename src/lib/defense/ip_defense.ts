export const runtime = "nodejs";

import geoip from "geoip-lite";
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
import type { Lookup } from "geoip-lite";

interface LookupExtended extends Lookup {
  org: string;
}

const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY || "";
const abuseClient = ABUSEIPDB_API_KEY
  ? new AbuseIPDBClient(ABUSEIPDB_API_KEY)
  : null;

export async function analyzeThreat(
  input: string
): Promise<Omit<DefenseResult, "timestamp" | "_id">> {
  console.log(`🔍 Starting IP analysis for: ${input}`);

  const result: Omit<DefenseResult, "timestamp" | "_id"> = {
    input: {
      type: "ip",
      data: input,
    },
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
    await runGeoIPAgent(result, input);
    await runAbuseIPDBAgent(result, input);
    calculateFinalRisk(result);
    generateRemediationSteps(result);

    result.status = "complete";
    addTimelineEvent(result, "IP Analysis Complete", "System");

    console.log("✅ IP analysis completed successfully");
    return result;
  } catch (error: unknown) {
    console.error("❌ IP analysis failed:", error);
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
  result: Omit<DefenseResult, "timestamp" | "_id">,
  input: string
) {
  const agentId = "geoip-offline";
  const agent: AgentStatus = {
    id: agentId,
    name: "GeoIP Offline Lookup",
    description: "MaxMind GeoLite2 database (country, city, ISP)",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Offline GeoIP lookup started", agent.name);

  try {
    agent.progress = 50;

    const geo = geoip.lookup(input) as LookupExtended;

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify(geo);

    if (geo) {
      const isp = geo.org || "Unknown";

      const details = `Country: ${geo.country || "Unknown"}, City: ${
        geo.city || "Unknown"
      }, ISP: ${isp}`;
      result.findings.push({
        agent: agent.name,
        type: "info" as const,
        message: "IP geolocation resolved",
        details,
      });
      addTimelineEvent(result, `Geo resolved: ${geo.country}`, agent.name);

      const highRiskCountries = ["RU", "CN", "KP"];
      if (highRiskCountries.includes(geo.country || "")) {
        result.overallRisk += 20;
        result.findings.push({
          agent: agent.name,
          type: "warning" as const,
          message: "IP from high-risk country",
          details: `Country code: ${geo.country}`,
        });
      }
    } else {
      result.findings.push({
        agent: agent.name,
        type: "warning" as const,
        message: "IP geolocation not found",
      });
    }
  } catch (error) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = `Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: "GeoIP lookup failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runAbuseIPDBAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  input: string
) {
  const agentId = "abuseipdb";
  const agent: AgentStatus = {
    id: agentId,
    name: "AbuseIPDB Reputation",
    description: "Live abuse reports and confidence score",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Live reputation check started", agent.name);

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
    agent.progress = 25;

    const response: ClientResponse<APICheckEndpointResponse> =
      await abuseClient.check(input, {
        maxAgeInDays: 90,
      });

    agent.progress = 75;
    if (!response.result) {
      agent.progress = 100;
      agent.status = "error";
      agent.result = `Error: ${response.error}`;
      result.findings.push({
        agent: agent.name,
        type: "warning" as const,
        message: "AbuseIPDB check failed",
      });
      return;
    }
    const {
      abuseConfidenceScore,
      totalReports,
      countryCode,
      lastReportedAt,
      reports,
    } = response?.result.data || {};

    const categoryNumbers = reports.flatMap((report) => report.categories);

    const categoryNames = parseAbuseCategories(categoryNumbers);

    const details = `Confidence: ${abuseConfidenceScore}%, Reports: ${totalReports}, Country: ${
      countryCode || "Unknown"
    }, Recent: ${lastReportedAt}`;

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
        message: `IP has abuse history (Confidence: ${abuseConfidenceScore}%)`,
        details: `${details}. Categories: ${
          categoryNames.join(", ") || "None"
        }`,
      });
      addTimelineEvent(
        result,
        `${totalReports} abuse reports found`,
        agent.name
      );
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info" as const,
        message: "IP clean (no abuse reports)",
        details,
      });
    }

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify(response);
  } catch (error: unknown) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = `API Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: "AbuseIPDB check failed",
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
  result: Omit<DefenseResult, "timestamp" | "_id">
) {
  const steps = [
    "1. Block IP at firewall level",
    "2. Monitor network traffic from this IP",
    "3. Investigate related logs",
  ];

  if (result.severity === "critical") {
    steps.push(
      "4. Immediate quarantine and alert team",
      "5. Report to upstream ISP"
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
