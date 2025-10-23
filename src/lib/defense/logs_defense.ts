export const runtime = "nodejs";

import { z } from "zod";
import {
  DefenseResult,
  AgentStatus,
  Finding,
  ThreatMapData,
  TimelineEvent,
} from "@/types/types";
import { error } from "console";

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

interface Issue {
  code: string;
  message: string;
}

class LocalOutlierFactor {
  private k: number;
  private contamination: number;
  private fitted = false;
  private distancesMatrix: number[][] = [];
  private kDistances: number[] = [];
  private reachabilityCache: number[][] = [];

  constructor(options: { kNeighbors?: number; contamination?: number } = {}) {
    this.k = Math.max(1, options.kNeighbors || 20);
    this.contamination = Math.max(
      0.001,
      Math.min(0.5, options.contamination || 0.1)
    );
  }

  fit(trainingData: number[][]): void {
    const n = trainingData.length;
    if (n === 0) throw new Error("Empty training data");
    this.distancesMatrix = Array.from({ length: n }, () =>
      new Array(n).fill(0)
    );
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = this._euclidean(trainingData[i], trainingData[j]);
        this.distancesMatrix[i][j] = d;
        this.distancesMatrix[j][i] = d;
      }
    }
    this.kDistances = this.distancesMatrix.map((row) => {
      const sorted = [...row].sort((a, b) => a - b);
      const idx = Math.min(this.k, sorted.length - 1);
      return sorted[idx];
    });

    this.reachabilityCache = this.distancesMatrix.map((row, i) => {
      const indexed = row
        .map((d, idx) => ({ d, idx }))
        .filter((x) => x.idx !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, this.k);
      return indexed.map((p) => Math.max(this.kDistances[i], p.d));
    });

    this.fitted = true;
  }

  predict(data: number[][]): LOFResult {
    if (!this.fitted) throw new Error("Model not fitted. Call fit() first.");
    const n = data.length;
    const scores: number[] = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const dists = data.map((q) => this._euclidean(data[i], q));
      const neighbors = dists
        .map((d, idx) => ({ d, idx }))
        .filter((x) => x.idx !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, Math.min(this.k, dists.length - 1));

      const kDistP =
        neighbors.length > 0 ? neighbors[neighbors.length - 1].d : 0.000001;
      const lrdPdenom =
        neighbors.reduce((sum, nb) => sum + Math.max(kDistP, nb.d), 0) || 1e-6;
      const lrdP = neighbors.length / lrdPdenom;

      let sumLRD = 0;
      for (const nb of neighbors) {
        const distsO = data.map((q) => this._euclidean(data[nb.idx], q));
        const neighO = distsO
          .map((d, idx) => ({ d, idx }))
          .filter((x) => x.idx !== nb.idx)
          .sort((a, b) => a.d - b.d)
          .slice(0, Math.min(this.k, distsO.length - 1));
        const kDistO =
          neighO.length > 0 ? neighO[neighO.length - 1].d : 0.000001;
        const lrdOdenom =
          neighO.reduce((sum, o2) => sum + Math.max(kDistO, o2.d), 0) || 1e-6;
        const lrdO = neighO.length / lrdOdenom;
        sumLRD += lrdO;
      }

      const lof = neighbors.length > 0 ? sumLRD / (neighbors.length * lrdP) : 0;
      scores[i] = lof;
    }

    const threshold = this._percentile(scores, 100 - this.contamination * 100);
    const labels = scores.map((s) => (s > threshold ? 1 : 0));
    return { scores, labels };
  }

  private _euclidean(p1: number[], p2: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const v1 = p1[i] ?? 0;
      const v2 = p2[i] ?? 0;
      sum += Math.pow(v1 - v2, 2);
    }
    return Math.sqrt(sum);
  }

  private _percentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.min(sorted.length - 1, lower + 1);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

let anomalyDetector: LocalOutlierFactor | null = null;
let trained = false;

function isPrivateIP(ip: string) {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );
}

function entropyOfString(s = "") {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  const len = s.length;
  let ent = 0;
  for (const k of Object.keys(freq)) {
    const p = freq[k] / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

function circularHourEncoding(dateStr: string) {
  const d = new Date(dateStr);
  const hour = d.getHours();
  const radians = (hour / 24) * 2 * Math.PI;
  return [Math.sin(radians), Math.cos(radians)];
}

function extractFeatures(log: ValidLogEntry) {
  const [hourSin, hourCos] = circularHourEncoding(log.timestamp);
  const day = new Date(log.timestamp).getDay();
  const isNight = hourSin < 0.25 || hourCos < 0 ? 1 : 0; 
  const isWeekend = day === 0 || day === 6 ? 1 : 0;
  const privateIP = isPrivateIP(log.ip) ? 1 : 0;
  const failedLogin = log.eventType === "failed_login" ? 1 : 0;
  const successLogin = log.eventType === "login" ? 1 : 0;
  const error = log.statusCode && log.statusCode >= 400 ? 1 : 0;
  const largeBytes = (log.bytes || 0) > 10_000_000 ? 1 : 0;
  const uaEntropy = entropyOfString(log.userAgent || "");
  const endpointDepth = log.endpoint ? log.endpoint.split("/").length : 0;
  const hasEndpoint = log.endpoint ? 1 : 0;

  const hasUser = log.userId ? 1 : 0;

  return [
    hourSin,
    hourCos,
    day,
    isNight,
    isWeekend,
    privateIP,
    failedLogin,
    successLogin,
    error,
    largeBytes,
    uaEntropy,
    endpointDepth,
    hasEndpoint,
    hasUser,
  ];
}

function normalizeFeatures(features: number[][]) {
  if (features.length === 0) return features;
  const cols = features[0].length;
  const mins = new Array(cols).fill(Infinity);
  const maxs = new Array(cols).fill(-Infinity);
  for (const row of features) {
    for (let i = 0; i < cols; i++) {
      mins[i] = Math.min(mins[i], row[i] ?? 0);
      maxs[i] = Math.max(maxs[i], row[i] ?? 0);
    }
  }
  const scaled = features.map((row) =>
    row.map((v, i) => {
      const min = mins[i];
      const max = maxs[i];
      if (max - min === 0) return 0;
      return (v - min) / (max - min);
    })
  );
  return scaled;
}

function generateMockTrainingData(count: number) {
  const data: number[][] = [];
  for (let i = 0; i < count; i++) {
    const hour = Math.floor(Math.random() * 24);
    const date = new Date();
    date.setHours(hour);
    const log: ValidLogEntry = {
      timestamp: date.toISOString(),
      ip:
        Math.random() < 0.7
          ? "192.168.1.10"
          : `5.${Math.floor(Math.random() * 255)}.${Math.floor(
              Math.random() * 255
            )}.${Math.floor(Math.random() * 255)}`,
      eventType: Math.random() < 0.1 ? "failed_login" : "login",
    } as ValidLogEntry;
    data.push(extractFeatures(log));
  }
  return normalizeFeatures(data);
}

async function trainModel() {
  if (anomalyDetector && trained) return;
  const synthetic = generateMockTrainingData(1200);
  anomalyDetector = new LocalOutlierFactor({
    kNeighbors: 20,
    contamination: 0.05,
  });
  try {
    anomalyDetector.fit(synthetic);
    trained = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    anomalyDetector = null;
    trained = false;
  }
}

export async function analyzeThreat(
  input: string
): Promise<Omit<DefenseResult, "timestamp" | "_id" | "userId">> {
  console.time("LOG_ANALYSIS_SPEED");

  await trainModel();

  const result: Omit<DefenseResult, "timestamp" | "_id" | "userId"> = {
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
    const parsed = JSON.parse(input);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    const logEntries: ValidLogEntry[] = [];
    for (const e of entries) {
      const safe = LogEntrySchema.safeParse(e);
      if (safe.success) logEntries.push(safe.data);
      else logEntries.push(e as ValidLogEntry);
    }

    await runZodValidationAgent(result, logEntries);
    await runTimePatternAgent(result, logEntries);
    await runRateLimitAgent(result, logEntries);
    await runErrorPatternAgent(result, logEntries);
    await runUserAnomalyAgent(result, logEntries);
    await runMLAnomalyAgent(result, logEntries);
    await runAbuseIPDBAgent(result, logEntries);

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
      type: "warning",
      message: "Log analysis failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
    return result;
  }
}

const abuseCache = new Map<string, { data: object; time: number }>();

async function queryAbuseIPDB(ip: string) {
  if (!process.env.ABUSEIPDB_KEY) {
    throw new Error("Missing mandatory AbuseIPDB API key (ABUSEIPDB_KEY).");
  }

  const cached = abuseCache.get(ip);
  if (cached && Date.now() - cached.time < 10 * 60 * 1000) return cached.data;

  const headers = {
    Key: process.env.ABUSEIPDB_KEY,
    Accept: "application/json",
  };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`,
        { headers }
      );
      if (!res.ok) throw new Error(`AbuseIPDB HTTP ${res.status}`);
      const data = await res.json();
      abuseCache.set(ip, { data, time: Date.now() });
      return data;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError;
}

async function runAbuseIPDBAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  logEntries: ValidLogEntry[]
) {
  const agent: AgentStatus = {
    id: "abuseipdb",
    name: "AbuseIPDB Enrichment",
    description: "IP reputation check via AbuseIPDB",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "AbuseIPDB enrichment started", agent.name);

  try {
    const publicIPs = [
      ...new Set(logEntries.map((l) => l.ip).filter((ip) => !isPrivateIP(ip))),
    ];
    const results = [];

    for (const ip of publicIPs) {
      const data = await queryAbuseIPDB(ip);
      const rep = data?.data;
      if (!rep) continue;

      const abuseScore = rep.abuseConfidenceScore || 0;
      const totalReports = rep.totalReports || 0;
      const isp = rep.isp || "Unknown";
      const domain = rep.domain || "N/A";
      const usageType = rep.usageType || "N/A";
      const country = rep.countryCode || "??";

      const risk = abuseScore * 0.7 + Math.min(totalReports / 10, 30);
      results.push({
        ip,
        abuseScore,
        totalReports,
        risk,
        isp,
        domain,
        usageType,
        country,
      });

      if (risk >= 60) {
        result.findings.push({
          agent: agent.name,
          type: "critical",
          message: `High abuse score (${abuseScore}) for IP ${ip}`,
          details: `ISP: ${isp}, Domain: ${domain}, Country: ${country}, Reports: ${totalReports}`,
        });
      } else if (risk >= 30) {
        result.findings.push({
          agent: agent.name,
          type: "warning",
          message: `Moderate risk IP ${ip} (score ${abuseScore})`,
          details: `ISP: ${isp}, Domain: ${domain}`,
        });
      }
      result.overallRisk += Math.min(risk * 0.2, 15);
    }

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify({ analyzed: results.length });
    addTimelineEvent(result, "AbuseIPDB lookup complete", agent.name);
  } catch {
    agent.progress = 100;
    agent.status = "error";
    result.findings.push({
      agent: agent.name,
      type: "info",
      message: "AbuseIPDB lookup failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function runZodValidationAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
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

  const valid: number[] = [];
  const invalid: { index: number; issues: Issue[] }[] = [];
  for (const [i, entry] of logEntries.entries()) {
    const v = LogEntrySchema.safeParse(entry);
    if (v.success) valid.push(i);
    else invalid.push({ index: i, issues: v.error.issues });
  }

  agent.progress = 100;
  agent.status = "complete";
  agent.result = JSON.stringify({
    valid: valid.length,
    invalid: invalid.length,
  });

  if (invalid.length > 0) {
    result.overallRisk += Math.min(invalid.length * 8, 20);
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: `${invalid.length} invalid log entries`,
      details: `First errors: ${JSON.stringify(invalid.slice(0, 3))}`,
    });
  } else {
    result.findings.push({
      agent: agent.name,
      type: "info",
      message: "All logs valid",
    });
  }
}

async function runTimePatternAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
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

  let night = 0;
  let weekend = 0;
  for (const e of logEntries) {
    const d = new Date(e.timestamp);
    const h = d.getHours();
    const day = d.getDay();
    if (h < 6 || h >= 22) night++;
    if (day === 0 || day === 6) weekend++;
  }

  agent.progress = 100;
  agent.status = "complete";

  const total = logEntries.length || 1;
  const nightPct = (night / total) * 100;
  const weekendPct = (weekend / total) * 100;

  if (nightPct > 10) {
    result.overallRisk += Math.min(Math.round(nightPct) * 0.6, 25);
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: `${night} night events (${nightPct.toFixed(1)}%)`,
      details: "High night activity compared to baseline",
    });
  }
  if (weekendPct > 15) {
    result.overallRisk += Math.min(Math.round(weekendPct) * 0.5, 20);
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: `${weekend} weekend events (${weekendPct.toFixed(1)}%)`,
      details: "High weekend activity compared to baseline",
    });
  }

  if (night === 0 && weekend === 0) {
    result.findings.push({
      agent: agent.name,
      type: "info",
      message: "Normal business hours",
    });
  }
}

async function runRateLimitAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  logEntries: ValidLogEntry[]
) {
  const agent: AgentStatus = {
    id: "rate-limit",
    name: "Rate Analysis",
    description: "Brute force detection",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Rate analysis started", agent.name);

  const failedByIP: Record<string, number> = {};
  const failedByUser: Record<string, number> = {};
  for (const e of logEntries) {
    if (e.eventType === "failed_login") {
      failedByIP[e.ip] = (failedByIP[e.ip] || 0) + 1;
      if (e.userId) failedByUser[e.userId] = (failedByUser[e.userId] || 0) + 1;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bruteIPs = Object.entries(failedByIP).filter(([_, c]) => c >= 5).length;
  const bruteUsers = Object.entries(failedByUser).filter(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ([_, c]) => c >= 5
  ).length;

  agent.progress = 100;
  agent.status = "complete";

  if (bruteIPs + bruteUsers > 0) {
    const score = Math.min((bruteIPs + bruteUsers) * 35, 85);
    result.overallRisk += score;
    result.findings.push({
      agent: agent.name,
      type: "critical",
      message: `${bruteIPs} IP(s) and ${bruteUsers} user(s) show brute-force patterns`,
      details: `Failed counts IPs: ${JSON.stringify(
        failedByIP
      )} | Users: ${JSON.stringify(failedByUser)}`,
    });
  } else if (Object.values(failedByIP).some((c) => c >= 3)) {
    result.overallRisk += 15;
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "Elevated failed login activity",
    });
  } else {
    result.findings.push({
      agent: agent.name,
      type: "info",
      message: "No brute-force detected",
    });
  }
}

async function runErrorPatternAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
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

  let errCount = 0;
  const types: string[] = [];
  for (const e of logEntries) {
    if (e.statusCode && e.statusCode >= 400) {
      errCount++;
      types.push(`${e.statusCode}:${e.eventType}`);
    }
  }

  agent.progress = 100;
  agent.status = "complete";

  if (errCount > 0) {
    const add = Math.min(errCount * 4, 25);
    result.overallRisk += add;
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: `${errCount} HTTP errors`,
      details: types.slice(0, 5).join(", "),
    });
  } else {
    result.findings.push({
      agent: agent.name,
      type: "info",
      message: "No HTTP errors",
    });
  }
}

async function runUserAnomalyAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  logEntries: ValidLogEntry[]
) {
  const agent: AgentStatus = {
    id: "user-anomaly",
    name: "User/IP Anomalies",
    description: "Detect rapid user switching across IPs / impossible travel",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "User/IP anomaly analysis started", agent.name);
  const byUser: Record<string, { ip: string; time: number }[]> = {};
  for (const e of logEntries) {
    if (!e.userId) continue;
    const t = new Date(e.timestamp).getTime();
    (byUser[e.userId] = byUser[e.userId] || []).push({ ip: e.ip, time: t });
  }

  let anomalies = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [user, events] of Object.entries(byUser)) {
    events.sort((a, b) => a.time - b.time);
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const cur = events[i];
      const dt = Math.abs(cur.time - prev.time) / 1000;
      if (prev.ip !== cur.ip && dt < 60 * 15) {
        if (!isPrivateIP(prev.ip) && !isPrivateIP(cur.ip)) {
          anomalies++;
        }
      }
    }
  }

  agent.progress = 100;
  agent.status = "complete";
  agent.result = JSON.stringify({ anomalies });

  if (anomalies > 0) {
    result.overallRisk += Math.min(anomalies * 12, 30);
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: `${anomalies} impossible-travel events detected`,
    });
  } else {
    result.findings.push({
      agent: agent.name,
      type: "info",
      message: "No user/IP anomalies",
    });
  }
}

async function runMLAnomalyAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  logEntries: ValidLogEntry[]
) {
  if (!anomalyDetector) {
    const agent: AgentStatus = {
      id: "ml-anomaly",
      name: "ML Anomaly Detection",
      description: "LOF anomaly scoring (fallback: z-score)",
      status: "processing",
      progress: 0,
    };
    result.agents.push(agent);
    addTimelineEvent(result, "ML fallback detection started", agent.name);

    const failedByIP: Record<string, number> = {};
    for (const e of logEntries)
      if (e.eventType === "failed_login")
        failedByIP[e.ip] = (failedByIP[e.ip] || 0) + 1;

    const vals = Object.values(failedByIP);
    const mean = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
    const sd = Math.sqrt(
      vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
        (vals.length || 1) || 0
    );

    let anomalies = 0;
    for (const v of vals) {
      const z = sd === 0 ? 0 : Math.abs((v - mean) / sd);
      if (z > 2.5 || v >= 5) anomalies++;
    }

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify({ anomalies, method: "zscore" });

    if (anomalies > 0) {
      result.overallRisk += Math.min(anomalies * 12, 40);
      result.findings.push({
        agent: agent.name,
        type: "critical",
        message: `${anomalies} anomalies (z-score)`,
      });
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "No ML anomalies (fallback)",
      });
    }

    return;
  }

  const agent: AgentStatus = {
    id: "ml-anomaly",
    name: "ML Anomaly Detection",
    description: "LOF anomaly scoring",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "ML anomaly detection started", agent.name);

  const rawFeatures = logEntries.map(extractFeatures);
  const norm = normalizeFeatures(rawFeatures);

  try {
    const { labels } = anomalyDetector.predict(norm);
    const anomalies = labels.filter((l) => l === 1).length;

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify({ anomalies, total: labels.length });

    if (anomalies > 0) {
      const rate = (anomalies / Math.max(1, labels.length)) * 100;
      result.overallRisk += Math.min(Math.round(rate) * 0.6, 45);
      result.findings.push({
        agent: agent.name,
        type: "critical",
        message: `${anomalies} anomalous entries`,
        details: `Anomaly rate: ${rate.toFixed(1)}%`,
      });
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "No ML anomalies",
      });
    }
  } catch (err) {
    agent.progress = 100;
    agent.status = "error";
    agent.result = JSON.stringify({ error: String(err) });
    result.findings.push({
      agent: agent.name,
      type: "error",
      message: "ML agent failed, used fallback heuristics",
    });
  }
}

function calculateFinalRisk(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  result.overallRisk = Math.min(
    100,
    Math.max(0, Math.round(result.overallRisk))
  );
  if (result.overallRisk >= 80) result.severity = "critical";
  else if (result.overallRisk >= 60) result.severity = "high";
  else if (result.overallRisk >= 30) result.severity = "medium";
  else result.severity = "low";

  const base = result.overallRisk;
  result.threatMap = [
    {
      category: "Schema Validation",
      risk: Math.min(base * 0.15, 15),
      threats: 0,
    },
    { category: "Time Patterns", risk: Math.min(base * 0.2, 25), threats: 0 },
    { category: "Rate Analysis", risk: Math.min(base * 0.35, 35), threats: 0 },
    { category: "Error Patterns", risk: Math.min(base * 0.15, 15), threats: 0 },
    { category: "ML Anomalies", risk: Math.min(base * 0.25, 25), threats: 0 },
  ];

  for (const f of result.findings) {
    if (f.type === "critical") {
      result.threatMap.forEach((t) => (t.threats += 1));
    } else if (f.type === "warning") {
      result.threatMap.forEach((t) => (t.threats += 0));
    }
  }
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  const steps: string[] = [
    "1. Review anomalous log entries",
    "2. Block IPs showing brute force patterns",
    "3. Enforce MFA for affected users",
    "4. Rotate any exposed credentials",
    "5. Capture and preserve logs for IR",
  ];
  if (result.severity === "critical") {
    steps.unshift("IMMEDIATE INCIDENT RESPONSE REQUIRED");
  }
  result.remediationSteps = steps;
}

function addTimelineEvent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  event: string,
  agent: string
) {
  result.timeline.push({ time: new Date().toISOString(), agent, event });
}
