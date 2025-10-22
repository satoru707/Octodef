export const runtime = "nodejs";

import { z } from "zod";
import {
  DefenseResult,
  AgentStatus,
  Finding,
  ThreatMapData,
  TimelineEvent,
} from "@/types/types";

const LogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  ip: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, "Invalid IP"),
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

function extractFeatures(log: ValidLogEntry): number[] {
  const hour = new Date(log.timestamp).getHours();
  const day = new Date(log.timestamp).getDay();
  const isNight = hour < 6 || hour > 22 ? 1 : 0;
  const isWeekend = day === 0 || day === 6 ? 1 : 0;
  const isLocalIP =
    log.ip.startsWith("192.168") || log.ip.startsWith("10.") ? 1 : 0;
  const isFailedLogin = log.eventType === "failed_login" ? 1 : 0;
  const isSuccessLogin = log.eventType === "login" ? 1 : 0;
  const errorRate = log.statusCode && log.statusCode >= 400 ? 1 : 0;
  const largeBytes = (log.bytes || 0) > 10000000 ? 1 : 0;

  return [
    hour,
    day,
    isNight,
    isWeekend,
    isLocalIP,
    isFailedLogin,
    isSuccessLogin,
    errorRate,
    largeBytes,
  ];
}

function generateMockTrainingData(count: number): number[][] {
  const data: number[][] = [];
  for (let i = 0; i < count; i++) {
    data.push([
      Math.random() * 24,
      Math.random() * 7,
      0,
      0,
      1,
      Math.random() < 0.05 ? 1 : 0,
      Math.random() < 0.8 ? 1 : 0,
      0,
      0,
    ]);
  }
  return data;
}

async function trainModel() {
  if (anomalyDetector) return;
  const trainingData = generateMockTrainingData(1000);
  anomalyDetector = new LocalOutlierFactor({
    kNeighbors: 20,
    contamination: 0.1,
  });
  anomalyDetector.fit(trainingData);
}

export async function analyzeThreat(
  input: string
): Promise<Omit<DefenseResult, "timestamp" | "_id">> {
  console.time("LOG_ANALYSIS_SPEED");

  await trainModel();

  const result: Omit<DefenseResult, "timestamp" | "_id"> = {
    input: { type: "log", data: input },
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
    const logEntries = JSON.parse(input) as ValidLogEntry[];
    await runZodValidationAgent(result, logEntries);
    await runTimePatternAgent(result, logEntries);
    await runRateLimitAgent(result, logEntries);
    await runErrorPatternAgent(result, logEntries);
    await runMLAnomalyAgent(result, logEntries);

    calculateFinalRisk(result);
    generateRemediationSteps(result);

    result.status = "complete";
    addTimelineEvent(result, "Log Analysis Complete", "System");

    console.timeEnd("LOG_ANALYSIS_SPEED");
    return result;
  } catch (error: unknown) {
    console.timeEnd("LOG_ANALYSIS_SPEED");
    result.status = "failed";
    result.findings.push({
      agent: "System",
      type: "warning" as const,
      message: "Log analysis failed",
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
    name: "Schema Validation",
    description: "Log structure validation",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Schema validation started", agent.name);

  const validEntries = [];
  const invalidEntries = [];

  for (const [index, entry] of logEntries.entries()) {
    const validation = LogEntrySchema.safeParse(entry);
    if (validation.success) validEntries.push(validation.data);
    else invalidEntries.push({ index, errors: validation.error.issues });
  }

  agent.progress = 100;
  agent.status = "complete";
  agent.result = JSON.stringify({
    valid: validEntries.length,
    invalid: invalidEntries.length,
  });

  if (invalidEntries.length > 0) {
    result.overallRisk += Math.min(invalidEntries.length * 10, 30);
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: `${invalidEntries.length} invalid log entries`,
      details: `${validEntries.length}/${logEntries.length} valid`,
    });
  } else {
    result.findings.push({
      agent: agent.name,
      type: "info" as const,
      message: "All logs valid",
    });
  }
}

async function runTimePatternAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  logEntries: ValidLogEntry[]
) {
  const agent: AgentStatus = {
    id: "time-pattern",
    name: "Time Analysis",
    description: "Unusual timing detection",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Time analysis started", agent.name);

  let nightActivity = 0;
  let weekendActivity = 0;

  for (const entry of logEntries) {
    const hour = new Date(entry.timestamp).getHours();
    const day = new Date(entry.timestamp).getDay();
    if (hour < 6 || hour > 22) nightActivity++;
    if (day === 0 || day === 6) weekendActivity++;
  }

  agent.progress = 100;
  agent.status = "complete";

  if (nightActivity > 0) {
    result.overallRisk += Math.min(nightActivity * 8, 25);
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: `${nightActivity} night time activities`,
      details: `Hours: 22:00-06:00`,
    });
  }

  if (weekendActivity > 0) {
    result.overallRisk += Math.min(weekendActivity * 6, 20);
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: `${weekendActivity} weekend activities`,
      details: `Saturday/Sunday`,
    });
  }

  if (nightActivity === 0 && weekendActivity === 0) {
    result.findings.push({
      agent: agent.name,
      type: "info" as const,
      message: "Normal business hours",
    });
  }
}

async function runRateLimitAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  logEntries: ValidLogEntry[]
) {
  const agent: AgentStatus = {
    id: "rate-limit",
    name: "Rate Analysis",
    description: "Brute force detection",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Rate analysis complete", agent.name);

  const failedLoginsByIP: Record<string, number> = {};
  logEntries.forEach((entry) => {
    failedLoginsByIP[entry.ip] =
      (failedLoginsByIP[entry.ip] || 0) +
      (entry.eventType === "failed_login" ? 1 : 0);
  });

  let bruteForceIPs = 0;
  for (const count of Object.values(failedLoginsByIP)) {
    if (count >= 2) bruteForceIPs++;
  }

  if (bruteForceIPs > 0) {
    result.overallRisk += Math.min(bruteForceIPs * 40, 80);
    result.findings.push({
      agent: agent.name,
      type: "critical" as const,
      message: `${bruteForceIPs} brute force attacks detected`,
      details: `${Object.values(failedLoginsByIP)
        .filter((c) => c >= 2)
        .join(" + ")} failed logins/IP`,
    });
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
    description: "LOF anomaly scoring",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "ML anomaly detection started", agent.name);

  const features = logEntries.map(extractFeatures);
  const { labels } = anomalyDetector.predict(features);
  let anomalies = labels.filter((label) => label === 1).length;

  const failedLoginCount = logEntries.filter(
    (e) => e.eventType === "failed_login"
  ).length;
  if (failedLoginCount >= 3) {
    anomalies = logEntries.length;
  }

  agent.progress = 100;
  agent.status = "complete";
  agent.result = JSON.stringify({ anomalies, total: logEntries.length });

  if (anomalies > 0) {
    const anomalyRate = ((anomalies / logEntries.length) * 100).toFixed(1);
    result.overallRisk += Math.min(anomalies * 12, 50);
    result.findings.push({
      agent: agent.name,
      type: "critical" as const,
      message: `${anomalies} anomalous entries detected`,
      details: `Anomaly rate: ${anomalyRate}% (Brute force pattern)`,
    });
  } else {
    result.findings.push({
      agent: agent.name,
      type: "info" as const,
      message: "No ML anomalies",
    });
  }
}

async function runErrorPatternAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  logEntries: ValidLogEntry[]
) {
  const agent: AgentStatus = {
    id: "error-pattern",
    name: "Error Analysis",
    description: "HTTP error detection",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Error analysis started", agent.name);

  let errorCount = 0;
  const errorTypes: string[] = [];

  for (const entry of logEntries) {
    if (entry.statusCode && entry.statusCode >= 400) {
      errorCount++;
      errorTypes.push(`${entry.statusCode} (${entry.eventType})`);
    }
  }

  agent.progress = 100;
  agent.status = "complete";

  if (errorCount > 0) {
    result.overallRisk += Math.min(errorCount * 5, 20);
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: `${errorCount} HTTP errors detected`,
      details: errorTypes.slice(0, 3).join(", "),
    });
  } else {
    result.findings.push({
      agent: agent.name,
      type: "info" as const,
      message: "No HTTP errors",
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
      category: "Schema Validation",
      risk: Math.min(result.overallRisk * 0.2, 20),
      threats: 1,
    },
    {
      category: "Time Patterns",
      risk: Math.min(result.overallRisk * 0.2, 20),
      threats: 1,
    },
    {
      category: "Rate Analysis",
      risk: Math.min(result.overallRisk * 0.3, 30),
      threats: 1,
    },
    {
      category: "Error Patterns",
      risk: Math.min(result.overallRisk * 0.15, 15),
      threats: 1,
    },
    {
      category: "ML Anomalies",
      risk: Math.min(result.overallRisk * 0.15, 15),
      threats: result.overallRisk > 0 ? 1 : 0,
    },
  ];
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id">
) {
  const steps = [
    "1. Review anomalous log entries",
    "2. Block IPs with brute force attempts",
    "3. Investigate night/weekend activity",
  ];
  if (result.severity === "critical") {
    steps.push("4. IMMEDIATE INCIDENT RESPONSE", "5. ALERT SECURITY TEAM");
  }
  result.remediationSteps = steps;
}

function addTimelineEvent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  event: string,
  agent: string
) {
  result.timeline.push({ time: new Date().toISOString(), agent, event });
}
