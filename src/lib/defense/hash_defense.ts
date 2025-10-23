export const runtime = "nodejs";

import { DefenseResult, AgentStatus, Finding } from "@/types/types";

type VTv3Response = Record<string, unknown> | undefined;
type HybridAnalysisResponse = unknown;
type MalShareResponse = string | undefined;

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";
const HA_API_KEY = process.env.HYBRIDANALYSIS_API_KEY || "";
const ABUSEIPDB_KEY = process.env.ABUSEIPDB_API_KEY || "";
const MALSHARE_KEY = process.env.MALSHARE_API_KEY || "";

const ABUSEIPDB_CACHE_MS = 10 * 60 * 1000;
const abuseCache = new Map<
  string,
  { data: Record<string, unknown>; ts: number }
>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stringEntropy(s: string): number {
  if (!s || s.length === 0) return 0;
  const counts: Record<string, number> = {};
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  const len = s.length;
  let ent = 0;
  for (const k of Object.keys(counts)) {
    const p = counts[k] / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

function hashTypeOf(
  h: string
): "md5" | "sha1" | "sha256" | "sha512" | "unknown" {
  const s = h.trim().toLowerCase();
  if (/^[a-f0-9]{32}$/.test(s)) return "md5";
  if (/^[a-f0-9]{40}$/.test(s)) return "sha1";
  if (/^[a-f0-9]{64}$/.test(s)) return "sha256";
  if (/^[a-f0-9]{128}$/.test(s)) return "sha512";
  return "unknown";
}

function isValidIP(ip: string) {
  return (
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
    ip.split(".").every((n) => Number(n) >= 0 && Number(n) <= 255)
  );
}

export async function analyzeThreat(
  input: string
): Promise<Omit<DefenseResult, "timestamp" | "_id" | "userId">> {
  console.time("HASH_ANALYSIS_SPEED");

  const result: Omit<DefenseResult, "timestamp" | "_id" | "userId"> = {
    input: { type: "hash", data: input },
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
    const normalizedHash = input.trim().toLowerCase();
    await runLocalHeuristicAgent(result, normalizedHash);

    const vtPromise = runVirusTotalAgent(result, normalizedHash);
    const haPromise = runHybridAnalysisAgent(result, normalizedHash);
    const msPromise = runMalShareAgent(result, normalizedHash);

    const settled = await Promise.allSettled([vtPromise, haPromise, msPromise]);

    const discoveredIPs = new Set<string>();
    const vtSettled = settled[0];
    const haSettled = settled[1];

    if (vtSettled.status === "fulfilled" && vtSettled.value) {
      for (const ip of extractIPsFromVirusTotalResult(vtSettled.value))
        discoveredIPs.add(ip);
    }
    if (haSettled.status === "fulfilled" && haSettled.value) {
      for (const ip of extractIPsFromHybridResult(haSettled.value))
        discoveredIPs.add(ip);
    }

    await runAbuseIPDBAgent(result, Array.from(discoveredIPs));

    calculateFinalRisk(result);
    generateRemediationSteps(result);

    result.status = "complete";
    addTimelineEvent(result, "Hash Analysis Complete", "System");
    console.timeEnd("HASH_ANALYSIS_SPEED");
    return result;
  } catch (err: unknown) {
    console.timeEnd("HASH_ANALYSIS_SPEED");
    result.status = "failed";
    result.findings.push({
      agent: "System",
      type: "warning",
      message: "Hash analysis failed",
      details: err instanceof Error ? err.message : String(err),
    });
    return result;
  }
}

async function runLocalHeuristicAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  hash: string
) {
  const agent: AgentStatus = {
    id: "local-heuristic",
    name: "Local Heuristics",
    description: "Quick local checks and entropy heuristics",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Local heuristics started", agent.name);

  try {
    const htype = hashTypeOf(hash);
    const isKnownEmptySHA256 =
      htype === "sha256" &&
      hash ===
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const isEicarSHA1 =
      htype === "sha1" && hash === "3395856ce81f2b7382dee72602f798b642f14140";
    const isEicarSHA256 =
      htype === "sha256" &&
      hash ===
        "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f";

    if (isKnownEmptySHA256) {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "Empty file hash (SHA256 of empty file)",
        details: "Known benign empty file hash",
      });
    } else if (isEicarSHA1 || isEicarSHA256) {
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "EICAR test file hash detected",
        details: "AV engines typically mark EICAR as test sample",
      });
      result.overallRisk += 40;
    }

    if (!/^[a-f0-9]+$/i.test(hash)) {
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "Non-hex characters in hash string",
        details: "Possible malformed input",
      });
      result.overallRisk += 10;
    }

    switch (htype) {
      case "md5":
        result.findings.push({
          agent: agent.name,
          type: "info",
          message: "MD5 hash format detected",
        });
        break;
      case "sha1":
        result.findings.push({
          agent: agent.name,
          type: "info",
          message: "SHA1 hash format detected",
        });
        break;
      case "sha256":
        result.findings.push({
          agent: agent.name,
          type: "info",
          message: "SHA256 hash format detected",
        });
        break;
      case "sha512":
        result.findings.push({
          agent: agent.name,
          type: "info",
          message: "SHA512 hash format detected",
        });
        break;
      default:
        result.findings.push({
          agent: agent.name,
          type: "info",
          message: "Unknown hash format",
        });
        result.overallRisk += 5;
    }

    const ent = stringEntropy(hash);
    if (ent < 3.5) {
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "Low entropy in hash string",
        details: `entropy=${ent.toFixed(2)}`,
      });
      result.overallRisk += 5;
    }

    agent.status = "complete";
    agent.progress = 100;
    agent.result = JSON.stringify({ hashType: htype, entropy: ent });
  } catch (err: unknown) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "Local heuristics failed",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

async function runVirusTotalAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  fileHash: string
): Promise<VTv3Response> {
  const agent: AgentStatus = {
    id: "virustotal",
    name: "VirusTotal Intelligence",
    description: "Multi-engine detections + reputation",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "VirusTotal lookup started", agent.name);

  if (!VT_API_KEY) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = "No VirusTotal key configured";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "VirusTotal skipped - missing key",
    });
    return undefined;
  }

  try {
    const res = await fetch(
      `https://www.virustotal.com/api/v3/files/${fileHash}`,
      {
        headers: { "x-apikey": VT_API_KEY },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`VT HTTP ${res.status} ${text}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    agent.status = "complete";
    agent.progress = 100;
    agent.result = JSON.stringify(data);

    const attrs = (data?.data as Record<string, unknown>)?.attributes as
      | Record<string, unknown>
      | undefined;
    const stats = (attrs?.last_analysis_stats as Record<string, unknown>) ?? {};
    const positives =
      typeof stats?.malicious === "number" ? stats.malicious : 0;
    const total =
      Object.values(stats).reduce(
        (a: number, b) => a + (typeof b === "number" ? b : 0),
        0
      ) || 1;
    const detectionRate = ((positives / total) * 100).toFixed(1);

    result.findings.push({
      agent: agent.name,
      type: positives > 0 ? (positives > 5 ? "critical" : "warning") : "info",
      message:
        positives > 0
          ? `${positives}/${total} engines detected`
          : "No detections",
      details: `VT detection rate: ${detectionRate}%`,
    });

    result.overallRisk += Math.min(positives * 10, 80);
    return data;
  } catch (err: unknown) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "VirusTotal lookup failed",
      details: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

async function runHybridAnalysisAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  fileHash: string
): Promise<HybridAnalysisResponse> {
  const agent: AgentStatus = {
    id: "hybrid-analysis",
    name: "HybridAnalysis",
    description: "Sandbox + static lookups (HybridAnalysis)",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "HybridAnalysis lookup started", agent.name);

  if (!HA_API_KEY) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = "No HybridAnalysis key";
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "HybridAnalysis skipped - missing key",
    });
    return undefined;
  }

  try {
    const body = new URLSearchParams({ hash: fileHash }).toString();
    const res = await fetch(
      "https://www.hybrid-analysis.com/api/v2/search/hash",
      {
        method: "POST",
        headers: {
          "api-key": HA_API_KEY,
          "user-agent": "HashDefender/1.0",
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HybridAnalysis HTTP ${res.status} ${txt}`);
    }

    const data = (await res.json()) as unknown;
    agent.status = "complete";
    agent.progress = 100;
    agent.result = JSON.stringify(
      Array.isArray(data) ? data.slice(0, 3) : data
    );

    const sample =
      Array.isArray(data) && data.length > 0
        ? (data[0] as Record<string, unknown>)
        : undefined;
    if (sample) {
      const threatScore =
        typeof sample?.threat_score === "number"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (sample as any).threat_score
          : 0;
      result.findings.push({
        agent: agent.name,
        type:
          threatScore >= 80
            ? "critical"
            : threatScore >= 40
            ? "warning"
            : "info",
        message: `HybridAnalysis threat_score ${threatScore}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: `verdict: ${String((sample as any)?.verdict ?? "unknown")}`,
      });
      result.overallRisk += Math.min(threatScore, 60);
    } else {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "No HybridAnalysis match",
      });
    }

    return data;
  } catch (err: unknown) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "HybridAnalysis lookup failed",
      details: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

async function runMalShareAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  fileHash: string
): Promise<MalShareResponse> {
  const agent: AgentStatus = {
    id: "malshare",
    name: "MalShare",
    description: "Open malware repository fallback",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "MalShare lookup started", agent.name);

  try {
    const key = MALSHARE_KEY || "free";
    const res = await fetch(
      `https://malshare.com/api.php?api_key=${encodeURIComponent(
        key
      )}&action=details&hash=${encodeURIComponent(fileHash)}`
    );
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`MalShare HTTP ${res.status} ${t}`);
    }
    const text = await res.text();
    agent.status = "complete";
    agent.progress = 100;
    agent.result = text.slice(0, 1000);

    if (text.includes("HASH NOT FOUND") || text.trim().length === 0) {
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "Not found in MalShare",
      });
    } else {
      result.overallRisk += 15;
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "Found in MalShare (possible malware)",
      });
    }

    return text;
  } catch (err: unknown) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
    result.findings.push({
      agent: agent.name,
      type: "warning",
      message: "MalShare lookup failed",
      details: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

async function queryAbuseIPDBSingle(
  ip: string
): Promise<Record<string, unknown>> {
  const cached = abuseCache.get(ip);
  if (cached && Date.now() - cached.ts < ABUSEIPDB_CACHE_MS) return cached.data;
  if (!ABUSEIPDB_KEY)
    throw new Error("Missing mandatory ABUSEIPDB API key (ABUSEIPDB_API_KEY)");
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = new URL("https://api.abuseipdb.com/api/v2/check");
      url.searchParams.set("ipAddress", ip);
      url.searchParams.set("maxAgeInDays", "90");
      const res = await fetch(url.toString(), {
        headers: {
          Key: ABUSEIPDB_KEY,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        const status = res.status;
        if (status === 429 || status >= 500) {
          lastErr = new Error(`AbuseIPDB HTTP ${status} ${txt}`);
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw new Error(`AbuseIPDB HTTP ${status} ${txt}`);
      }

      const data = (await res.json()) as Record<string, unknown>;
      abuseCache.set(ip, { data, ts: Date.now() });
      return data;
    } catch (err: unknown) {
      lastErr = err;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  throw lastErr;
}

async function runAbuseIPDBAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  ips: string[]
) {
  const agent: AgentStatus = {
    id: "abuseipdb",
    name: "AbuseIPDB Enrichment",
    description: "IP reputation enrichment (mandatory if key present)",
    status: "processing",
    progress: 0,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "AbuseIPDB enrichment started", agent.name);

  try {
    if (!ABUSEIPDB_KEY) {
      agent.status = "error";
      agent.progress = 100;
      agent.result = "Missing ABUSEIPDB key";
      result.findings.push({
        agent: agent.name,
        type: "error",
        message: "AbuseIPDB key missing (mandatory)",
      });
      return;
    }

    if (!ips || ips.length === 0) {
      agent.status = "complete";
      agent.progress = 100;
      agent.result = JSON.stringify({ analyzed: 0 });
      result.findings.push({
        agent: agent.name,
        type: "info",
        message: "No IPs found to enrich",
      });
      return;
    }

    const successes: {
      ip: string;
      score: number;
      reports: number;
      country?: string;
      usageType?: string;
    }[] = [];

    for (const ip of ips) {
      if (!isValidIP(ip)) {
        result.findings.push({
          agent: agent.name,
          type: "warning",
          message: `AbuseIPDB lookup failed for ${ip}`,
          details: "Invalid IP format",
        });
        continue;
      }
      try {
        const raw = await queryAbuseIPDBSingle(ip);
        const payload = (raw as Record<string, unknown>)?.data as
          | Record<string, unknown>
          | undefined;
        const abuseConfidenceScore =
          typeof payload?.abuseConfidenceScore === "number"
            ? payload.abuseConfidenceScore
            : 0;
        const totalReports =
          typeof payload?.totalReports === "number" ? payload.totalReports : 0;
        const countryCode =
          typeof payload?.countryCode === "string"
            ? payload.countryCode
            : undefined;
        const usageType =
          typeof payload?.usageType === "string"
            ? payload.usageType
            : undefined;

        const localRisk = Math.min(
          abuseConfidenceScore * 0.7 + Math.min(totalReports / 10, 30),
          100
        );

        successes.push({
          ip,
          score: localRisk,
          reports: totalReports,
          country: countryCode,
          usageType,
        });

        if (localRisk >= 60) {
          result.findings.push({
            agent: agent.name,
            type: "critical",
            message: `High abuse risk for IP ${ip} (score ${abuseConfidenceScore})`,
            details: `score=${localRisk.toFixed(
              1
            )} reports=${totalReports} country=${countryCode ?? "?"} usage=${
              usageType ?? "?"
            }`,
          });
          result.overallRisk += Math.min(localRisk * 0.25, 25);
        } else if (localRisk >= 30) {
          result.findings.push({
            agent: agent.name,
            type: "warning",
            message: `Moderate abuse risk for IP ${ip} (score ${abuseConfidenceScore})`,
            details: `score=${localRisk.toFixed(1)} reports=${totalReports}`,
          });
          result.overallRisk += Math.min(localRisk * 0.12, 12);
        } else {
          result.findings.push({
            agent: agent.name,
            type: "info",
            message: `Low abuse risk for IP ${ip}`,
            details: `score=${localRisk.toFixed(1)}`,
          });
        }
      } catch (ipErr: unknown) {
        result.findings.push({
          agent: agent.name,
          type: "warning",
          message: `AbuseIPDB lookup failed for ${ip}`,
          details: ipErr instanceof Error ? ipErr.message : String(ipErr),
        });
      }
    }

    agent.status = "complete";
    agent.progress = 100;
    agent.result = JSON.stringify({ analyzed: successes.length });
    addTimelineEvent(result, "AbuseIPDB enrichment complete", agent.name);
  } catch (err: unknown) {
    agent.status = "error";
    agent.progress = 100;
    agent.result = JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
    result.findings.push({
      agent: agent.name,
      type: "error",
      message: "AbuseIPDB agent failed",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

function extractIPsFromVirusTotalResult(data: VTv3Response): string[] {
  if (!data) return [];
  try {
    const out = new Set<string>();
    const asAny = data as Record<string, unknown>;
    const attrs = (asAny?.data as Record<string, unknown>)?.attributes as
      | Record<string, unknown>
      | undefined;
    const submissions =
      (attrs?.last_submission as unknown) ??
      (attrs?.submission as unknown) ??
      null;
    if (Array.isArray(submissions)) {
      for (const s of submissions) {
        if (typeof s === "object" && s !== null) {
          const ip =
            (s as Record<string, unknown>)?.submission_source_ip ??
            (s as Record<string, unknown>)?.source ??
            (s as Record<string, unknown>)?.ip;
          if (typeof ip === "string" && isValidIP(ip)) out.add(ip);
        }
      }
    }
    const behavior =
      (attrs?.network_activity as unknown) ??
      (attrs?.behavior as unknown) ??
      null;
    if (Array.isArray(behavior)) {
      for (const b of behavior) {
        if (typeof b === "object" && b !== null) {
          const ip =
            (b as Record<string, unknown>)?.ip_address ??
            (b as Record<string, unknown>)?.dst ??
            (b as Record<string, unknown>)?.host;
          if (typeof ip === "string" && isValidIP(ip)) out.add(ip);
        }
      }
    }
    const jsonText = JSON.stringify(attrs ?? {});
    const m = jsonText.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
    for (const mm of m) if (isValidIP(mm[0])) out.add(mm[0]);
    return Array.from(out);
  } catch {
    return [];
  }
}

function extractIPsFromHybridResult(
  data: HybridAnalysisResponse | undefined
): string[] {
  if (!data) return [];
  try {
    const out = new Set<string>();
    const asAny = data as unknown;
    if (Array.isArray(asAny)) {
      for (const item of asAny) {
        const nets =
          (item as Record<string, unknown>)?.network ??
          (item as Record<string, unknown>)?.hosts ??
          null;
        if (Array.isArray(nets)) {
          for (const n of nets) {
            if (typeof n === "string" && isValidIP(n)) out.add(n);
            if (
              typeof n === "object" &&
              n !== null &&
              typeof (n as Record<string, unknown>)?.ip === "string"
            ) {
              const ip = (n as Record<string, unknown>)?.ip as string;
              if (isValidIP(ip)) out.add(ip);
            }
          }
        }
      }
    }
    const txt = JSON.stringify(asAny);
    const m = txt.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
    for (const mm of m) if (isValidIP(mm[0])) out.add(mm[0]);
    return Array.from(out);
  } catch {
    return [];
  }
}

function calculateFinalRisk(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  result.overallRisk = Math.max(
    0,
    Math.min(100, Math.round(result.overallRisk))
  );
  if (result.overallRisk >= 80) result.severity = "critical";
  else if (result.overallRisk >= 60) result.severity = "high";
  else if (result.overallRisk >= 30) result.severity = "medium";
  else result.severity = "low";

  result.threatMap = [
    {
      category: "Local Heuristics",
      risk: Math.min(result.overallRisk * 0.15, 15),
      threats: 0,
    },
    {
      category: "VirusTotal",
      risk: Math.min(result.overallRisk * 0.5, 50),
      threats: 0,
    },
    {
      category: "HybridAnalysis",
      risk: Math.min(result.overallRisk * 0.25, 25),
      threats: 0,
    },
    {
      category: "MalShare",
      risk: Math.min(result.overallRisk * 0.1, 10),
      threats: 0,
    },
    {
      category: "AbuseIPDB",
      risk: Math.min(result.overallRisk * 0.2, 20),
      threats: 0,
    },
  ];

  for (const f of result.findings) {
    if (f.type === "critical")
      result.threatMap.forEach((t) => (t.threats += 1));
  }
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  const steps: string[] = [
    "1. Block/hash IoCs in EDR and AV platforms",
    "2. Search telemetry for files with this hash",
    "3. Quarantine and submit samples for sandboxing",
  ];
  if (result.severity === "critical" || result.overallRisk >= 80) {
    steps.unshift("IMMEDIATE INCIDENT RESPONSE REQUIRED");
    steps.push("Escalate to IR and share indicators with threat intel");
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
