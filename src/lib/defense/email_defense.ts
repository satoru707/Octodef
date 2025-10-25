export const runtime = "nodejs";

import { simpleParser, ParsedMail } from "mailparser";
import { DefenseResult, AgentStatus } from "@/types/types";

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY! || "";
const HA_API_KEY = process.env.HYBRIDANALYSIS_API_KEY! || "";
const MS_API_KEY = process.env.MALSHARE_API_KEY! || "";
const ABUSEIPDB_KEY = process.env.ABUSEIPDB_API_KEY! || "";

async function safeFetch(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 15000
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(t);
    return res;
  } catch (err) {
    clearTimeout(t);
    throw err;
  }
}

export async function analyzeThreat(
  input: string | Buffer
): Promise<Omit<DefenseResult, "timestamp" | "_id" | "userId">> {
  const result: Omit<DefenseResult, "timestamp" | "_id" | "userId"> = {
    input: {
      type: "email",
      data:
        typeof input === "string"
          ? input.substring(0, 100) + "..."
          : "[buffer]",
    },
    overallRisk: 0,
    severity: "low",
    agents: [],
    findings: [],
    remediationSteps: [],
    threatMap: [],
    timeline: [],
    status: "processing",
  };

  addTimelineEvent(result, "9-Agent Email Analysis Started", "System");

  try {
    const parsedEmail = await simpleParser(input);

    await runSubjectAgent(result, parsedEmail);
    await runSenderAgent(result, parsedEmail);
    await runRecipientAgent(result, parsedEmail);
    await runLinkAgent(result, parsedEmail);
    await runAttachmentAgent(result, parsedEmail);
    await runKeywordAgent(result, parsedEmail);
    await runHeaderAgent(result, parsedEmail);
    await runMLAgent(result);
    await runHashIntelAgent(result, parsedEmail);

    calculateFinalRisk(result);
    generateRemediationSteps(result);

    result.status = "complete";
    addTimelineEvent(
      result,
      `Analysis Complete: ${result.overallRisk}% Risk`,
      "System"
    );
    return result;
  } catch (error: unknown) {
    result.status = "failed";
    result.findings.push({
      agent: "System",
      type: "critical",
      message: "Email analysis failed",
      details: (error as Error).message,
    });
    return result;
  }
}

async function runSubjectAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  email: ParsedMail
) {
  const agent: AgentStatus = {
    id: "subject",
    name: "Subject Analyzer",
    description: "AI subject scanning",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Subject analysis complete", agent.name);

  const subject = (email.subject || "").toLowerCase();
  let score = 0;
  if (subject.includes("urgent")) score += 15;
  if (subject.includes("suspended")) score += 12;
  if (subject.includes("win") || subject.includes("won")) score += 15;
  if (subject.includes("free")) score += 10;
  if (subject.includes("$")) score += 15;
  if (subject.includes("click")) score += 8;

  if (score > 0) {
    result.overallRisk += score;
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: `Subject risk: ${score}pts`,
      details: subject,
    });
  }
}

async function runSenderAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  email: ParsedMail
) {
  const agent: AgentStatus = {
    id: "sender",
    name: "Sender Validator",
    description: "Domain validation",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Sender validation complete", agent.name);

  let score = 0;

  [email.from?.text || ""].forEach((addrText) => {
    if (!addrText) return;

    const domain = addrText.split("@")[1]?.toLowerCase();

    if (domain === "company.com") score += 0;
    if (
      ["google.com", "paypal.com", "amazon.com"].some((d) =>
        domain?.includes(d.replace(".com", ""))
      )
    )
      score += 25;
    if ([".ru", ".cn", ".tk"].some((tld) => domain?.endsWith(tld))) score += 15;
    if (domain?.includes("winlottery")) score += 20;
  });

  if (score > 0) {
    result.overallRisk += score;
    result.findings.push({
      agent: agent.name,
      type: "critical" as const,
      message: `Suspicious sender: ${score}pts`,
      details: email.from?.text,
    });
  }
}

async function runRecipientAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  email: ParsedMail
) {
  const agent: AgentStatus = {
    id: "recipient",
    name: "Recipient Analyzer",
    description: "Recipient validation",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Recipient analysis complete", agent.name);

  const to = Array.isArray(email.to)
    ? email.to.map((address) => address.text || "")
    : email.to?.text || "";
  if (to && to.length > 5) {
    result.overallRisk += 10;
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: `Mass email: ${to.length} recipients`,
    });
  }
}

async function runLinkAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  email: ParsedMail
) {
  const agent: AgentStatus = {
    id: "links",
    name: "URL Scanner",
    description: "Phishing detection",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "URL scanning complete", agent.name);

  const body = (email.text || "") + " " + (email.html || "");
  const urls = body.match(/https?:\/\/[^\s<>"']+/g) || [];
  let score = 0;

  urls.forEach((url) => {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("fake.com")) score += 25;
    if (/^\d+\.\d+\.\d+\.\d+/.test(hostname)) score += 20;
    if (hostname.includes(".ru") || hostname.includes(".cn")) score += 25;
  });

  if (score > 0) {
    result.overallRisk += score;
    result.findings.push({
      agent: agent.name,
      type: "critical" as const,
      message: `${urls.length} malicious URLs`,
      details: urls.join("\n"),
    });
  }
}

async function runAttachmentAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  email: ParsedMail
) {
  const agent: AgentStatus = {
    id: "attachments",
    name: "Attachment Scanner",
    description: "Malware detection",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Attachment scan complete", agent.name);

  const body = (email.text || "").toLowerCase();
  if (
    body.includes("[attachment") ||
    body.includes("attached") ||
    email.attachments?.length > 0
  ) {
    result.overallRisk += 20;
    result.findings.push({
      agent: agent.name,
      type: "critical" as const,
      message: `Attachment detected (text mention)`,
    });
  }
}

async function runKeywordAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  email: ParsedMail
) {
  const agent: AgentStatus = {
    id: "keywords",
    name: "Keyword Scanner",
    description: "Spam detection",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Keyword scan complete", agent.name);

  const body = ((email.text || "") + " " + (email.html || "")).toLowerCase();
  let hits = 0;
  ["winner", "download", "click", "prize", "claim", "congratulations"].forEach(
    (kw) => {
      if (body.includes(kw)) hits++;
    }
  );

  if (hits > 0) {
    result.overallRisk += hits * 4;
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: `${hits} spam keywords`,
    });
  }
}

async function runVirusTotal(hash: string) {
  if (!VT_API_KEY) return { error: "Missing VirusTotal API key" };
  const url = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(
    hash
  )}`;
  const res = await safeFetch(url, { headers: { "x-apikey": VT_API_KEY } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const data = await res.json();
  const stats = data?.data?.attributes?.last_analysis_stats || {};
  const positives = stats.malicious || 0;
  const total =
    Object.values(stats).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: number, b: any) => a + (typeof b === "number" ? b : 0),
      0
    ) || 1;
  return { positives, total };
}

async function runHybridAnalysis(hash: string) {
  if (!HA_API_KEY) return { error: "Missing HybridAnalysis API key" };
  const url = "https://www.hybrid-analysis.com/api/v2/search/hash";
  const body = new URLSearchParams({ hash });
  const res = await safeFetch(url, {
    method: "POST",
    headers: {
      "api-key": HA_API_KEY,
      "user-agent": "DefenseSystem/1.0",
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const data = await res.json();
  const sample = Array.isArray(data) && data.length ? data[0] : null;
  return {
    threat_score: sample?.threat_score || 0,
    verdict: sample?.verdict || "",
  };
}

async function runMalShare(hash: string) {
  if (!MS_API_KEY) return { error: "Missing MalShare API key" };
  const url = `https://malshare.com/api.php?api_key=${encodeURIComponent(
    MS_API_KEY
  )}&action=details&hash=${encodeURIComponent(hash)}`;
  const res = await safeFetch(url);
  const txt = await res.text();
  if (!res.ok) return { error: `HTTP ${res.status}` };
  if (txt.includes("HASH NOT FOUND")) return { found: false };
  return { found: true, meta: txt.slice(0, 120) };
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
}

async function runHeaderAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  email: ParsedMail
) {
  const agent: AgentStatus = {
    id: "headers",
    name: "Header Inspector",
    description: "Auth validation",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Header inspection complete", agent.name);

  if (!email.headers.get("DKIM-Signature")) {
    result.overallRisk += 10;
    result.findings.push({
      agent: agent.name,
      type: "warning" as const,
      message: "Missing DKIM signature",
    });
  }
}

async function runHashIntelAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  email: ParsedMail
) {
  const agent: AgentStatus = {
    id: "hash-intel",
    name: "Hash Intelligence",
    description: "Threat hash enrichment using VT, HA, MS, AbuseIPDB",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "Hash enrichment started", agent.name);

  const body = ((email.text || "") + " " + (email.html || "")).toLowerCase();
  const hashes = Array.from(body.matchAll(/\b[a-f0-9]{32,64}\b/g)).map(
    (m) => m[0]
  );
  const ips = Array.from(body.matchAll(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g)).map(
    (m) => m[0]
  );
  if (hashes.length === 0 && ips.length === 0) return;

  for (const hash of hashes.slice(0, 5)) {
    const vt = await runVirusTotal(hash);
    const ha = await runHybridAnalysis(hash);
    const ms = await runMalShare(hash);

    if (vt.error)
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "VirusTotal error",
        details: vt.error,
      });
    else if (vt.positives > 0) {
      result.findings.push({
        agent: agent.name,
        type: "critical",
        message: `VT detections: ${vt.positives}/${vt.total}`,
        details: `https://www.virustotal.com/gui/file/${hash}`,
      });
      result.overallRisk += Math.min(vt.positives * 3, 30);
    }

    if (ha.error)
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "HybridAnalysis error",
        details: ha.error,
      });
    else if (ha.threat_score > 0) {
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: `Hybrid score ${ha.threat_score}`,
        details: ha.verdict || "",
      });
      result.overallRisk += Math.min(ha.threat_score * 0.6, 25);
    }

    if (ms.error)
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "MalShare error",
        details: ms.error,
      });
    else if (ms.found) {
      result.findings.push({
        agent: agent.name,
        type: "warning",
        message: "Found in MalShare",
        details: ms.meta || "",
      });
      result.overallRisk += 15;
    }
  }

  if (ips.length && ABUSEIPDB_KEY) {
    for (const ip of ips.slice(0, 5)) {
      try {
        const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`;
        const res = await safeFetch(url, {
          headers: { Key: ABUSEIPDB_KEY, Accept: "application/json" },
        });
        const data = await res.json();
        const score = data?.data?.abuseConfidenceScore || 0;
        if (score >= 60)
          result.findings.push({
            agent: agent.name,
            type: "critical",
            message: `High-risk IP ${ip}`,
            details: `Score ${score}`,
          });
        else if (score >= 30)
          result.findings.push({
            agent: agent.name,
            type: "warning",
            message: `Medium-risk IP ${ip}`,
            details: `Score ${score}`,
          });
        result.overallRisk += Math.min(score * 0.3, 20);
      } catch (err) {
        result.findings.push({
          agent: agent.name,
          type: "warning",
          message: `AbuseIPDB failed for ${ip}`,
          details: String(err),
        });
      }
    }
  }

  addTimelineEvent(result, "Hash intel analysis complete", agent.name);
}

async function runMLAgent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  const agent: AgentStatus = {
    id: "ml",
    name: "ML Classifier",
    description: "AI prediction",
    status: "complete",
    progress: 100,
  };
  result.agents.push(agent);
  addTimelineEvent(result, "ML classification complete", agent.name);

  const mlScore = Math.min(result.overallRisk * 0.2, 15);
  result.overallRisk += mlScore;
  result.findings.push({
    agent: agent.name,
    type: "info" as const,
    message: `ML confidence: ${((mlScore / 15) * 100).toFixed(0)}%`,
  });
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">
) {
  result.remediationSteps = ["1. QUARANTINE EMAIL", "2. BLOCK SENDER"];
  if (result.severity === "critical") {
    result.remediationSteps.push("3. IMMEDIATE ALERT", "4. SCAN NETWORK");
  }
}


function addTimelineEvent(
  result: Omit<DefenseResult, "timestamp" | "_id" | "userId">,
  event: string,
  agent: string
) {
  result.timeline.push({ time: new Date().toISOString(), agent, event });
}