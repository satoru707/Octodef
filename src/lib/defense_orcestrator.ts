export const runtime = "nodejs";

import { DefenseResult, AgentStatus, Finding, ThreatType } from "@/types/types";
import { lofRegistry } from "./ml_learner";
import { analyzeThreat as analyzeEmail } from "./defense/email_defense";
import { analyzeThreat as analyzeIP } from "./defense/ip_defense";
import { analyzeThreat as analyzeLogs } from "./defense/logs_defense";
import { analyzeThreat as analyzeHash } from "./defense/hash_defense";
import { analyzeThreat as analyzeURL } from "./defense/url_defense";

const AGENTS = {
  SCOUT: {
    id: "scout",
    name: "Scout",
    description:
      "Performs initial reconnaissance and threat detection. Scouts the digital landscape for potential vulnerabilities and suspicious activity.",
    status: "idle" as const,
    progress: 0,
  } as AgentStatus,
  SENTINEL: {
    id: "sentinel",
    name: "Sentinel",
    description:
      "Manages perimeter defense and access control. Acts as the first line of defense, blocking unauthorized access attempts.",
    status: "idle" as const,
    progress: 0,
  } as AgentStatus,
  ANALYST: {
    id: "analyst",
    name: "Analyst",
    description:
      "Conducts deep behavioral analysis and pattern recognition. Uses advanced algorithms to identify anomalous behavior.",
    status: "idle" as const,
    progress: 0,
  } as AgentStatus,
  ISOLATOR: {
    id: "isolator",
    name: "Isolator",
    description:
      "Handles threat containment and quarantine. Immediately isolates identified threats to prevent spread.",
    status: "idle" as const,
    progress: 0,
  } as AgentStatus,
  REMEDIATOR: {
    id: "remediator",
    name: "Remediator",
    description:
      "Executes automated response and recovery procedures. Implements fixes and patches to neutralize threats.",
    status: "idle" as const,
    progress: 0,
  } as AgentStatus,
  LEARNER: {
    id: "learner",
    name: "Learner",
    description:
      "Applies machine learning-based threat intelligence. Continuously learns from new threats to improve detection.",
    status: "idle" as const,
    progress: 0,
  } as AgentStatus,
  ALERTER: {
    id: "alerter",
    name: "Alerter",
    description:
      "Provides real-time notifications and escalation. Ensures security teams are immediately informed of critical issues.",
    status: "idle" as const,
    progress: 0,
  } as AgentStatus,
  ORCHESTRATOR: {
    id: "orchestrator",
    name: "Orchestrator",
    description:
      "Coordinates all agents and serves as the decision engine. Ensures all agents work in perfect harmony.",
    status: "idle" as const,
    progress: 0,
  } as AgentStatus,
};

const telemetry = { analyses: 0, criticals: 0, avgLatency: 0 };

function addTimeline(
  result: Omit<DefenseResult, "_id" | "userId" | "timestamp">,
  agent: string,
  event: string
) {
  result.timeline.push({ time: new Date().toISOString(), agent, event });
}

function updateAgent(
  result: Omit<DefenseResult, "_id" | "userId" | "timestamp">,
  id: string,
  status: AgentStatus["status"],
  progress: number,
  res?: string
) {
  const a = result.agents.find((x) => x.id === id);
  if (a) {
    a.status = status;
    a.progress = progress;
    if (res) a.result = res;
  }
}

function addFinding(
  result: Omit<DefenseResult, "_id" | "userId" | "timestamp">,
  f: Finding
) {
  result.findings.push(f);
  if (f.type === "critical") result.threatMap.forEach((t) => t.threats++);
}

export async function analyzeThreat(
  input: string | Buffer,
  type: ThreatType
): Promise<Omit<DefenseResult, "_id" | "userId" | "timestamp">> {
  const start = Date.now();
  telemetry.analyses++;

  const result: Omit<DefenseResult, "_id" | "userId" | "timestamp"> = {
    input: {
      type,
      data:
        typeof input === "string" ? input.slice(0, 120) + "..." : "[buffer]",
    },
    overallRisk: 0,
    severity: "low",
    agents: [],
    findings: [],
    remediationSteps: [],
    threatMap: [
      { category: "Recon", risk: 0, threats: 0 },
      { category: "Intel", risk: 0, threats: 0 },
      { category: "Anomaly", risk: 0, threats: 0 },
      { category: "Containment", risk: 0, threats: 0 },
    ],
    timeline: [],
    status: "processing",
  };

  Object.values(AGENTS).forEach((a) =>
    result.agents.push({ ...a, status: "processing", progress: 0 })
  );
  updateAgent(result, "orchestrator", "processing", 0);
  addTimeline(result, "Orchestrator", "Defense AI Engine Started");

  try {
    updateAgent(result, "scout", "processing", 10);
    addTimeline(result, "Scout", "Recon started");
    result.input.type = type;
    updateAgent(result, "scout", "complete", 100, `Type: ${type}`);
    addTimeline(result, "Scout", `Classified as ${type}`);

    updateAgent(result, "sentinel", "processing", 20);
    addTimeline(result, "Sentinel", "Fetching threat intel");
    let intel: null | Omit<DefenseResult, "timestamp" | "_id" | "userId">;
    try {
      switch (type) {
        case "email":
          intel = await analyzeEmail(input);
          break;
        case "ip":
          intel = await analyzeIP(input as string);
          break;
        case "hash":
          intel = await analyzeHash(input as string);
          break;
        case "url":
          intel = await analyzeURL(input as string);
          break;
        case "log":
          intel = await analyzeLogs(input as string);
          break;
      }
      if (intel) {
        result.findings.push(...intel.findings);
        result.overallRisk += intel.overallRisk * 0.7;
        result.threatMap[1].risk = intel.overallRisk * 0.5;
        result.threatMap[1].threats = intel.findings.filter(
          (f: Finding) => f.type === "critical"
        ).length;
      }
    } catch (err) {
      addFinding(result, {
        agent: "Sentinel",
        type: "error",
        message: "Intel fetch failed",
        details: String(err),
      });
    }
    updateAgent(result, "sentinel", "complete", 100);
    addTimeline(result, "Sentinel", "Intel lookup complete");

    updateAgent(result, "analyst", "processing", 40);
    addTimeline(result, "Analyst", "Running ML anomaly detection");
    if (type === "log" && typeof input === "string") {
      await ensureModel();
      const features = extractLogFeatures(input);
      if (features.length > 0) {
        const { anomalyRate } = lofRegistry.baseline.predict(features);
        if (anomalyRate > 0.1) {
          const boost = Math.min(anomalyRate * 400, 50);
          result.overallRisk += boost;
          addFinding(result, {
            agent: "Analyst",
            type: "critical",
            message: `ML Anomaly Detected`,
            details: `${(anomalyRate * 100).toFixed(1)}% outlier rate`,
          });
          result.threatMap[2].risk = boost;
          result.threatMap[2].threats = Math.round(
            anomalyRate * features.length
          );
        } else {
          addFinding(result, {
            agent: "Analyst",
            type: "info",
            message: "No anomalies",
          });
        }
      }
    } else {
      addFinding(result, {
        agent: "Analyst",
        type: "info",
        message: "ML skipped (non-log)",
      });
    }
    updateAgent(result, "analyst", "complete", 100);
    addTimeline(result, "Analyst", "Anomaly scan complete");

    updateAgent(result, "isolator", "processing", 60);
    result.overallRisk = Math.min(100, Math.round(result.overallRisk));
    result.severity =
      result.overallRisk >= 80
        ? "critical"
        : result.overallRisk >= 60
        ? "high"
        : result.overallRisk >= 30
        ? "medium"
        : "low";
    result.threatMap[3].risk = result.overallRisk * 0.25;
    result.threatMap[3].threats = result.findings.filter(
      (f) => f.type === "critical"
    ).length;
    updateAgent(result, "isolator", "complete", 100);
    addTimeline(
      result,
      "Isolator",
      `Risk: ${result.overallRisk}% → ${result.severity}`
    );

    updateAgent(result, "remediator", "processing", 70);
    result.remediationSteps = generateRemediation(result.severity, type);
    updateAgent(result, "remediator", "complete", 100);
    addTimeline(result, "Remediator", "Playbook generated");

    updateAgent(result, "learner", "processing", 80);
    if (result.severity === "critical" || result.severity === "high") {
      const adaptiveData = generateAdaptiveData(result.findings);
      lofRegistry.adaptive.train(adaptiveData);
      updateAgent(result, "learner", "complete", 100, `Model updated`);
    } else {
      updateAgent(result, "learner", "complete", 100, "No update");
    }
    addTimeline(result, "Learner", "Model adapted");

    updateAgent(result, "alerter", "processing", 90);
    if (result.severity === "critical") {
      await sendAlert(result);
      addTimeline(result, "Alerter", "Alert sent");
    }
    updateAgent(result, "alerter", "complete", 100);

    result.status = "complete";
    const latency = Date.now() - start;
    telemetry.avgLatency =
      (telemetry.avgLatency * (telemetry.analyses - 1) + latency) /
      telemetry.analyses;
    if (result.severity === "critical") telemetry.criticals++;
    addTimeline(result, "Orchestrator", `Complete in ${latency}ms`);
  } catch (err) {
    result.status = "failed";
    addFinding(result, {
      agent: "Orchestrator",
      type: "error",
      message: "Analysis failed",
      details: String(err),
    });
    addTimeline(result, "Orchestrator", "Failed");
    result.agents.forEach((a) => {
      if (a.status === "processing")
        updateAgent(result, a.id, "error", a.progress);
    });
  }

  updateAgent(
    result,
    "orchestrator",
    result.status === "complete" ? "complete" : "error",
    100
  );
  return result;
}

async function ensureModel() {
  if (!lofRegistry.baseline.exportModel()) {
    const data = generateBaselineData(2500);
    lofRegistry.baseline.train(data);
  }
}

function extractLogFeatures(input: string): number[][] {
  return input
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 400)
    .map((l) => {
      const parts = l.split(" ");
      const ts = new Date(parts[0] || Date.now());
      const hour = ts.getHours(),
        day = ts.getDay();
      const ip = parts[1] || "0.0.0.0";
      const ua = l.match(/user-agent=([^ ]+)/)?.[1] || "";
      const bytes = parseInt(l.match(/bytes=(\d+)/)?.[1] || "0");
      return [
        Math.sin((hour / 12) * Math.PI),
        Math.cos((hour / 12) * Math.PI),
        day / 7,
        hour < 8 || hour > 18 ? 1 : 0,
        day === 0 || day === 6 ? 1 : 0,
        /10\.|192\.168\.|172\.16-31\./.test(ip) ? 1 : 0,
        l.includes("failed") ? 1 : 0,
        l.includes("login") ? 1 : 0,
        /4\d\d|5\d\d/.test(l) ? 1 : 0,
        bytes > 1e6 ? 1 : 0,
        entropy(ua),
        (l.match(/\/api|\/admin/g) || []).length,
        1,
        1,
      ];
    });
}

function entropy(s: string): number {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] || 0) + 1;
  return (
    -Object.values(freq).reduce(
      (sum, f) => sum + (f / s.length) * Math.log2(f / s.length),
      0
    ) || 0
  );
}

function generateBaselineData(n: number): number[][] {
  return Array.from({ length: n }, () => [
    Math.sin(((8 + Math.random() * 10) / 12) * Math.PI),
    Math.cos(((8 + Math.random() * 10) / 12) * Math.PI),
    (1 + Math.floor(Math.random() * 5)) / 7,
    0,
    0,
    1,
    0,
    1,
    0,
    0,
    3.5 + Math.random(),
    Math.floor(Math.random() * 3),
    1,
    1,
  ]);
}

function generateAdaptiveData(findings: Finding[]): number[][] {
  const base = generateBaselineData(500);
  const boost = findings.filter((f) => f.type === "critical").length * 0.2;
  return base.map((row) =>
    row.map((v) => v + Math.random() * boost - boost / 2)
  );
}

function generateRemediation(severity: string, type: ThreatType): string[] {
  const base = [
    `QUARANTINE ${type.toUpperCase()}`,
    "PRESERVE EVIDENCE",
    "CORRELATE WITH SIEM",
  ];
  if (severity === "critical")
    return ["ACTIVATE IR", ...base, "ESCALATE TO CIRT"];
  return base;
}

async function sendAlert(
  result: Omit<DefenseResult, "_id" | "userId" | "timestamp">
) {
  const webhook = process.env.ALERT_WEBHOOK;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "CRITICAL_THREAT",
        risk: result.overallRisk,
        type: result.input.type,
        findings: result.findings
          .filter((f) => f.type === "critical")
          .map((f) => f.message),
      }),
    });
  } catch {
    addFinding(result, {
      agent: "Alerter",
      type: "warning",
      message: "Alert failed",
    });
  }
}
