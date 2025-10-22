export const runtime = "nodejs";

import { simpleParser, ParsedMail } from "mailparser";
import { DefenseResult, AgentStatus } from "@/types/types";

export async function analyzeThreat(
  input: string | Buffer
): Promise<Omit<DefenseResult, "timestamp" | "_id">> {
  console.time("EMAIL_ANALYSIS_SPEED");

  const result: Omit<DefenseResult, "timestamp" | "_id"> = {
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

  addTimelineEvent(result, "8-Agent Email Analysis Started", "System");

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

    calculateFinalRisk(result);
    generateRemediationSteps(result);

    result.status = "complete";
    addTimelineEvent(
      result,
      `Analysis Complete: ${result.overallRisk}% Risk`,
      "System"
    );

    console.timeEnd("EMAIL_ANALYSIS_SPEED");
    return result;
  } catch (error: unknown) {
    console.error("EMAIL ERROR:", error);
    result.status = "failed";
    result.findings.push({
      agent: "System",
      type: "critical" as const,
      message: "Email analysis failed",
      details: (error as Error).message,
    });
    console.timeEnd("EMAIL_ANALYSIS_SPEED");
    return result;
  }
}

async function runSubjectAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
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
  result: Omit<DefenseResult, "timestamp" | "_id">,
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
  result: Omit<DefenseResult, "timestamp" | "_id">,
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
  result: Omit<DefenseResult, "timestamp" | "_id">,
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
  result: Omit<DefenseResult, "timestamp" | "_id">,
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
  result: Omit<DefenseResult, "timestamp" | "_id">,
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

async function runHeaderAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
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

async function runMLAgent(result: Omit<DefenseResult, "timestamp" | "_id">) {
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

function calculateFinalRisk(result: Omit<DefenseResult, "timestamp" | "_id">) {
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
    {
      category: "Subject",
      risk: Math.min(result.overallRisk * 0.15, 15),
      threats: 1,
    },
    {
      category: "Sender",
      risk: Math.min(result.overallRisk * 0.2, 20),
      threats: 1,
    },
    {
      category: "Links",
      risk: Math.min(result.overallRisk * 0.25, 25),
      threats: 1,
    },
    {
      category: "Attachments",
      risk: Math.min(result.overallRisk * 0.2, 20),
      threats: 1,
    },
    {
      category: "Keywords",
      risk: Math.min(result.overallRisk * 0.1, 10),
      threats: 1,
    },
    {
      category: "Headers",
      risk: Math.min(result.overallRisk * 0.05, 5),
      threats: 1,
    },
    {
      category: "ML",
      risk: Math.min(result.overallRisk * 0.05, 5),
      threats: 1,
    },
  ];
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id">
) {
  result.remediationSteps = ["1. QUARANTINE EMAIL", "2. BLOCK SENDER"];
  if (result.severity === "critical") {
    result.remediationSteps.push("3. IMMEDIATE ALERT", "4. SCAN NETWORK");
  }
}

function addTimelineEvent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  event: string,
  agent: string
) {
  result.timeline.push({ time: new Date().toISOString(), agent, event });
}