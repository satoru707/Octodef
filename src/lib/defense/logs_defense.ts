export const runtime = "nodejs";

import { z } from "zod";
import geoip from "geoip-lite";
import {
  DefenseResult,
  AgentStatus,
  Finding,
  ThreatMapData,
  TimelineEvent,
} from "@/types/types";

const LogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  ip: z.string().refine((value) => {
    return value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/) !== null;
  }),
  userId: z.string().optional(),
  eventType: z.enum(["login", "failed_login", "access", "download", "upload"]),
  endpoint: z.string().url().optional(),
  userAgent: z.string().optional(),
  statusCode: z.number().optional(),
  bytes: z.number().optional(),
});

type ValidLogEntry = z.infer<typeof LogEntrySchema>;

interface LOFResult {
  scores: number[];
  labels: number[];
}

class LocalOutlierFactor {
  private k: number;
  private contamination: number;

  constructor(options: { kNeighbors?: number; contamination?: number } = {}) {
    this.k = options.kNeighbors || 20;
    this.contamination = options.contamination || 0.1;
  }

  fit(trainingData: number[][]): void {
    this._computeDistances(trainingData);
  }

  predict(data: number[][]): LOFResult {
    if (!this._distances) {
      throw new Error("Model not fitted. Call fit() first.");
    }

    const n = data.length;
    const scores = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const p = data[i];
      const kDistP = this._kDistance(p, data);
      let sumReachDist = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const o = data[j];
        const reachDist = Math.max(kDistP, this._euclidean(p, o));
        sumReachDist += reachDist;
      }
      const lrdP = n / sumReachDist;

      let sumLRD = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const o = data[j];
        const kDistO = this._kDistance(o, data);
        let sumReachDistO = 0;
        for (let m = 0; m < n; m++) {
          if (j === m) continue;
          const q = data[m];
          const reachDistOQ = Math.max(kDistO, this._euclidean(o, q));
          sumReachDistO += reachDistOQ;
        }
        const lrdO = n / sumReachDistO;
        sumLRD += lrdO;
      }

      scores[i] = sumLRD / (n * lrdP);
    }
    const threshold = this._percentile(scores, this.contamination * 100);
    const labels = scores.map((score) => (score > threshold ? 1 : 0));

    return { scores, labels };
  }

  private _euclidean(p1: number[], p2: number[]): number {
    return Math.sqrt(
      p1.reduce((sum, val, i) => sum + Math.pow(val - p2[i], 2), 0)
    );
  }

  private _kDistance(p: number[], data: number[][]): number {
    const distances = data
      .map((q) => this._euclidean(p, q))
      .sort((a, b) => a - b);
    return distances[this.k] || 0;
  }

  private _percentile(arr: number[], percentile: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = lower + 1;
    const weight = index % 1;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private _computeDistances(data: number[][]): void {
    this._distances = data;
  }

  private _distances?: number[][];
}

let anomalyDetector: LocalOutlierFactor | null = null;

async function trainModel() {
  if (anomalyDetector) return;

  const trainingData = generateMockTrainingData(1000);
  anomalyDetector = new LocalOutlierFactor({
    kNeighbors: 20,
    contamination: 0.1,
  });
  anomalyDetector.fit(trainingData);
}

function extractFeatures(log: ValidLogEntry): number[] {
  const geo = geoip.lookup(log.ip) || { country: "unknown" };

  return [
    new Date(log.timestamp).getHours(),
    new Date(log.timestamp).getDay(),
    geo.country === "US" ? 1 : 0,
    log.ip.startsWith("192.168") ? 1 : 0,
    log.eventType === "failed_login" ? 1 : 0,
    log.eventType === "login" ? 1 : 0,
    (log.statusCode || 200) / 1000,
    (log.bytes || 0) / 1000000,
    ["RU", "CN", "KP"].includes(geo.country || "") ? 1 : 0,
  ];
}

function generateMockTrainingData(count: number): number[][] {
  const data: number[][] = [];
  for (let i = 0; i < count; i++) {
    data.push([
      Math.random() * 24,
      Math.random() * 7,
      Math.random(),
      Math.random(),
      Math.random() < 0.1 ? 1 : 0,
      Math.random() < 0.8 ? 1 : 0,
      Math.random(),
      Math.random(),
      Math.random() < 0.05 ? 1 : 0,
    ]);
  }
  return data;
}

export async function analyzeThreat(
  input: string | ValidLogEntry[]
): Promise<Omit<DefenseResult, "timestamp" | "_id">> {
  console.log(
    `🔍 Starting log analysis for: ${
      typeof input === "string" ? input : `${input.length} entries`
    }`
  );

  await trainModel();

  const result: Omit<DefenseResult, "timestamp" | "_id"> = {
    input: {
      type: "log",
      data: typeof input === "string" ? input : JSON.stringify(input),
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

  addTimelineEvent(result, "Log Analysis Started", "System");

  try {
    let logEntries: ValidLogEntry[];

    if (typeof input === "string") {
      logEntries = JSON.parse(input) as ValidLogEntry[];
    } else {
      logEntries = input;
    }

    await runZodValidationAgent(result, logEntries);
    await runGeoIPAgent(result, logEntries);
    await runMLAnomalyAgent(result, logEntries);

    calculateFinalRisk(result);
    generateRemediationSteps(result);

    result.status = "complete";
    addTimelineEvent(result, "Log Analysis Complete", "System");

    console.log("✅ Log analysis completed successfully");
    return result;
  } catch (error: unknown) {
    console.error("❌ Log analysis failed:", error);
    result.status = "failed";
    addTimelineEvent(
      result,
      `Analysis Failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "System"
    );
    result.findings.push({
      agent: "System",
      type: "warning" as const,
      message: "Log analysis failed - marked as safe",
      details: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

async function runZodValidationAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  logEntries: ValidLogEntry[]
) {
  const agent: AgentStatus = {
    id: "zod-validation",
    name: "Zod Schema Validation",
    description: "Validate log structure and data types",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Schema validation started", agent.name);

  try {
    agent.progress = 50;

    const validEntries: ValidLogEntry[] = [];
    const invalidEntries = [];

    for (const [index, entry] of logEntries.entries()) {
      const validation = LogEntrySchema.safeParse(entry);
      if (validation.success) {
        validEntries.push(validation.data);
      } else {
        invalidEntries.push({ index, errors: validation.error.issues });
      }
    }

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify({
      valid: validEntries.length,
      invalid: invalidEntries.length,
    });

    if (invalidEntries.length > 0) {
      result.overallRisk += Math.min(invalidEntries.length * 5, 30);
      result.findings.push({
        agent: agent.name,
        type: "warning" as const,
        message: `${invalidEntries.length} invalid log entries`,
        details: `Processed ${logEntries.length}, ${validEntries.length} valid`,
      });
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info" as const,
        message: "All log entries valid",
      });
    }
  } catch (error) {
    agent.status = "error";
    agent.result = error instanceof Error ? error.message : "Unknown error";
  }
}

async function runGeoIPAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  logEntries: ValidLogEntry[]
) {
  const agent: AgentStatus = {
    id: "geoip-offline",
    name: "GeoIP Lookup",
    description: "Offline IP geolocation analysis",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "GeoIP lookup started", agent.name);

  try {
    agent.progress = 50;

    const highRiskCountries = ["RU", "CN", "KP", "IR"];
    let highRiskIPs = 0;

    for (const entry of logEntries) {
      const geo = geoip.lookup(entry.ip);
      if (geo && highRiskCountries.includes(geo.country || "")) {
        highRiskIPs++;
      }
    }

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify({ highRiskIPs, total: logEntries.length });

    if (highRiskIPs > 0) {
      result.overallRisk += Math.min(highRiskIPs * 10, 40);
      result.findings.push({
        agent: agent.name,
        type: "warning" as const,
        message: `${highRiskIPs} IPs from high-risk countries`,
        details: `Total entries: ${logEntries.length}`,
      });
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info" as const,
        message: "No high-risk country IPs found",
      });
    }
  } catch (error) {
    agent.status = "error";
    agent.result = error instanceof Error ? error.message : "Unknown error";
  }
}

async function runMLAnomalyAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  logEntries: ValidLogEntry[]
) {
  if (!anomalyDetector) return;

  const agent: AgentStatus = {
    id: "ml-anomaly",
    name: "ML Anomaly Detection",
    description: "Local Outlier Factor (LOF) anomaly detection",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "ML anomaly detection started", agent.name);

  try {
    agent.progress = 30;

    const features = logEntries.map(extractFeatures);
    agent.progress = 60;

    const { labels } = anomalyDetector.predict(features);
    const anomalies = labels.filter((label) => label === 1).length;

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify({ anomalies, total: logEntries.length });

    if (anomalies > 0) {
      const anomalyRate = ((anomalies / logEntries.length) * 100).toFixed(1);
      result.overallRisk += Math.min(anomalies * 15, 60);

      result.findings.push({
        agent: agent.name,
        type: anomalies > 5 ? ("critical" as const) : ("warning" as const),
        message: `${anomalies} anomalous log entries detected`,
        details: `Anomaly rate: ${anomalyRate}%`,
      });
      addTimelineEvent(result, `${anomalies} anomalies detected`, agent.name);
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info" as const,
        message: "No anomalies detected",
      });
    }
  } catch (error) {
    agent.status = "error";
    agent.result = error instanceof Error ? error.message : "Unknown error";
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
      category: "Schema Validation",
      risk: Math.min(result.overallRisk * 0.2, 20),
      threats: 1,
    },
    {
      category: "GeoIP Analysis",
      risk: Math.min(result.overallRisk * 0.3, 30),
      threats: 1,
    },
    {
      category: "ML Anomalies",
      risk: Math.min(result.overallRisk * 0.5, 50),
      threats: result.overallRisk > 0 ? 1 : 0,
    },
  ];
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id">
) {
  const steps = [
    "1. Review flagged log entries",
    "2. Block high-risk IP addresses",
    "3. Investigate anomalous patterns",
  ];

  if (result.severity === "critical") {
    steps.push("4. Immediate incident response", "5. Alert security team");
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
