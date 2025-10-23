export const runtime = "nodejs";

import {
  AbuseIPDBClient,
  ClientResponse,
  APICheckEndpointResponse,
} from "abuseipdb-client";
import { DefenseResult, AgentStatus } from "@/types/types";
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
    findings: [],
    remediationSteps: [],
    threatMap: [],
    timeline: [],
    status: "processing",
  };
  addTimelineEvent(result, "IP Analysis Started", "System");

  try {
    await Promise.all([
      runGeoIPAgent(result, input),
      runAbuseIPDBAgent(result, input),
      runAbuseCHAgent(result, input),
      runSpamhausAgent(result, input),
      runMalShareAgent(result, input),
      runHybridAnalysisAgent(result, input),
    ]);

    calculateFinalRisk(result);
    generateRemediationSteps(result);
    result.status = "complete";
    addTimelineEvent(result, "IP Analysis Complete", "System");
    return result;
  } catch (error: unknown) {
    result.status = "failed";
    result.findings.push({
      agent: "System",
      type: "warning",
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
  const agent: AgentStatus = {
    id: "geoip-json",
    name: "GeoIP JSON Database",
    description: "1ms instant country lookup",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "GeoIP started", agent.name);

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
    result.findings.push({
      agent: agent.name,
      type: "info",
      message: "Country resolved",
      details: `Country: ${countryCode}`,
    });
    const risky = ["RU", "CN", "KP", "IR", "SY"];
    if (risky.includes(countryCode)) {
      result.overallRisk += 15;
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "High-risk geo location",
        details: `Country code: ${countryCode}`,
      });
    }
  } catch (error) {
    agent.status = "error";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "GeoIP lookup failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runAbuseIPDBAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agent: AgentStatus = {
    id: "abuseipdb",
    name: "AbuseIPDB Reputation",
    description: "Live abuse reports",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "AbuseIPDB check started", agent.name);

  if (!abuseClient) {
    agent.status = "error";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "No API key configured for AbuseIPDB",
    });
    return;
  }

  try {
    const response: ClientResponse<APICheckEndpointResponse> =
      await abuseClient.check(input, { maxAgeInDays: 90 });

    const data = response?.result?.data;
    agent.status = "complete";
    agent.result = JSON.stringify(data);

    if (!data) throw new Error("No AbuseIPDB result");

    const { abuseConfidenceScore, totalReports } = data;
    if (abuseConfidenceScore > 0) {
      result.overallRisk += Math.min(abuseConfidenceScore, 80);
      result.findings.push({
        agent: agent.name,
        type: abuseConfidenceScore > 50 ? "critical" : "warning",
        message: `IP has ${abuseConfidenceScore}% abuse score`,
        details: `${totalReports} total reports`,
      });
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "IP clean",
      });
    }
  } catch (error) {
    agent.status = "error";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "AbuseIPDB fetch failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runAbuseCHAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agent: AgentStatus = {
    id: "abusech",
    name: "Abuse.ch FeodoTracker",
    description: "C2 tracker database",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);

  try {
    const res = await fetch(
      `https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json`
    );
    const list = await res.json();
    const found = list.find(
      (e: Omit<DefenseResult, "timestamp" | "_id" | "userId">) =>
        e.input.data === input
    );

    if (found) {
      result.overallRisk += 25;
      agent.status = "complete";
      result.findings.push({
        agent: agent.name,
        type: "critical",
        message: "IP found in FeodoTracker list",
        details: `Malware family: ${found.malware || "unknown"}`,
      });
    } else {
      agent.status = "complete";
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "Not in FeodoTracker",
      });
    }
  } catch (error) {
    agent.status = "error";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "FeodoTracker failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// SPAMHAUS DROP
async function runSpamhausAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agent: AgentStatus = {
    id: "spamhaus",
    name: "Spamhaus DROP List",
    description: "Known botnet & spam IPs",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);

  try {
    const res = await fetch("https://www.spamhaus.org/drop/drop.txt");
    const text = await res.text();
    const found = text.includes(input);

    if (found) {
      result.overallRisk += 20;
      agent.status = "complete";
      result.findings.push({
        agent: agent.name,
        type: "critical",
        message: "IP found in Spamhaus DROP",
      });
    } else {
      agent.status = "complete";
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "Not in Spamhaus DROP",
      });
    }
  } catch (error) {
    agent.status = "error";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "Spamhaus fetch failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runMalShareAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agent: AgentStatus = {
    id: "malshare",
    name: "MalShare IP Intel",
    description: "Open malware repository",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);

  try {
    const apiKey = process.env.MALSHARE_API_KEY;
    if (!apiKey) throw new Error("Missing MALSHARE_API_KEY");

    const res = await fetch(
      `https://malshare.com/api.php?api_key=${apiKey}&action=search&query=${input}`
    );
    const text = await res.text();
    if (text.includes("No results")) {
      agent.status = "complete";
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "No matches in MalShare",
      });
    } else {
      result.overallRisk += 15;
      agent.status = "complete";
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "IP found in MalShare index",
      });
    }
  } catch (error) {
    agent.status = "error";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "MalShare query failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runHybridAnalysisAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  input: string
) {
  const agent: AgentStatus = {
    id: "hybridanalysis",
    name: "Hybrid Analysis",
    description: "Sandbox network indicator lookup",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);

  try {
    const apiKey = process.env.HYBRIDANALYSIS_API_KEY;
    if (!apiKey) throw new Error("Missing HYBRID_API_KEY");

    const res = await fetch(
      "https://www.hybrid-analysis.com/api/v2/search/hash",
      {
        method: "POST",
        headers: {
          "api-key": apiKey,
          Accept: "application/json",
          "User-Agent": "Falcon Sandbox",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ query: input }),
      }
    );

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      result.overallRisk += 25;
      agent.status = "complete";
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "IP seen in HybridAnalysis reports",
        details: `Samples: ${data.length}`,
      });
    } else {
      agent.status = "complete";
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "No HybridAnalysis records",
      });
    }
  } catch (error) {
    agent.status = "error";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "HybridAnalysis lookup failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function calculateFinalRisk(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  result.overallRisk = Math.min(result.overallRisk, 100);
  result.severity =
    result.overallRisk >= 80
      ? "critical"
      : result.overallRisk >= 60
      ? "high"
      : result.overallRisk >= 30
      ? "medium"
      : "low";

  result.threatMap = [
    { category: "GeoIP", risk: result.overallRisk * 0.2, threats: 1 },
    { category: "Reputation", risk: result.overallRisk * 0.5, threats: 1 },
    { category: "Malware Intel", risk: result.overallRisk * 0.3, threats: 1 },
  ];
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  const base = [
    "1. Block IP in firewall immediately",
    "2. Monitor inbound/outbound traffic",
    "3. Correlate with related IOC indicators",
  ];
  if (result.severity === "critical")
    base.push("4. Quarantine affected systems", "5. Notify security team");
  result.remediationSteps = base;
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

export default analyzeThreat;
