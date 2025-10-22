export const runtime = "nodejs";

import { simpleParser, ParsedMail } from "mailparser";
import parseAddresses from "email-addresses";
import { checkEmailSpam } from "email-spam-checker"; // ✅ PERFECT FOR EDGE
import {
  DefenseResult,
  AgentStatus,
  Finding,
  ThreatMapData,
  TimelineEvent,
} from "@/types/types";
import { AddressObject } from "mailparser";

// ✅ PURE JS EMAIL SPAM CHECKER - NO FILES, NO NATIVE CODE
export async function analyzeThreat(
  input: string | Buffer
): Promise<Omit<DefenseResult, "timestamp" | "_id">> {
  console.log(`🔍 Starting email analysis...`);

  const result: Omit<DefenseResult, "timestamp" | "_id"> = {
    input: {
      type: "email",
      data:
        typeof input === "string"
          ? input.substring(0, 100) + "..."
          : "[email buffer]",
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

  addTimelineEvent(result, "Email Analysis Started", "System");

  try {
    // 1. MAILPARSER AGENT
    const parsedEmail = await runMailParserAgent(result, input);

    // 2. EMAIL-ADDRESSES AGENT
    await runEmailAddressesAgent(result, parsedEmail);

    // 3. EMAIL-SPAM-CHECKER AGENT (✅ EDGE PERFECT)
    await runEmailSpamCheckerAgent(result, parsedEmail);

    // 4. FINALIZE
    calculateFinalRisk(result);
    generateRemediationSteps(result);

    result.status = "complete";
    addTimelineEvent(result, "Email Analysis Complete", "System");

    return result;
  } catch (error: unknown) {
    console.error("❌ Email analysis failed:", error);
    result.status = "failed";
    addTimelineEvent(
      result,
      `Analysis Failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "System"
    );
    return result;
  }
}

// === AGENT 1: Mailparser (UNCHANGED) ===
async function runMailParserAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  input: string | Buffer
): Promise<ParsedMail> {
  const agent: AgentStatus = {
    id: "mailparser",
    name: "Email Parser",
    description: "Extract headers, body, attachments",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Email parsing started", agent.name);

  try {
    agent.progress = 50;
    const parsed: ParsedMail = await simpleParser(input);

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify({
      subject: parsed.subject,
      from: (parsed.from as AddressObject)?.text,
      to: (parsed.to as AddressObject)?.text,
      hasAttachments: parsed.attachments?.length > 0,
    });

    (result as any).parsedEmail = parsed;

    // Suspicious subject
    if (
      parsed.subject?.toLowerCase().includes("urgent") ||
      parsed.subject?.toLowerCase().includes("suspended")
    ) {
      result.overallRisk += 10;
      result.findings.push({
        agent: agent.name,
        type: "warning" as const,
        message: "Suspicious subject line",
        details: `Subject: ${parsed.subject}`,
      });
    }

    // Attachments
    if (parsed.attachments?.length > 0) {
      result.overallRisk += 15;
      result.findings.push({
        agent: agent.name,
        type: "warning" as const,
        message: `${parsed.attachments.length} attachments detected`,
        details: parsed.attachments.map((att) => att.filename).join(", "),
      });
    }

    return parsed;
  } catch (error) {
    agent.status = "error";
    throw error;
  }
}

// === AGENT 2: email-addresses (UNCHANGED) ===
async function runEmailAddressesAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  parsedEmail: ParsedMail
) {
  const agent: AgentStatus = {
    id: "email-addresses",
    name: "Address Validator",
    description: "Validate sender/recipient addresses",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);

  try {
    agent.progress = 50;

    const fromParsed = parseAddresses(parsedEmail.from?.text ?? "");
    let suspiciousSenders = 0;

    for (const addr of fromParsed) {
      if (!addr.node || addr.node.domain === "example.com") {
        suspiciousSenders++;
        result.overallRisk += 20;
      }
      if (
        addr.node?.domain &&
        ["google.com", "microsoft.com", "paypal.com", "amazon.com"].includes(
          addr.node.domain.toLowerCase()
        )
      ) {
        suspiciousSenders++;
        result.overallRisk += 25;
      }
    }

    agent.progress = 100;
    agent.status = "complete";

    if (suspiciousSenders > 0) {
      result.findings.push({
        agent: agent.name,
        type: "critical" as const,
        message: `${suspiciousSenders} suspicious sender addresses`,
        details: fromParsed.map((a: any) => a.address).join(", "),
      });
    }
  } catch (error) {
    agent.status = "error";
  }
}

// === AGENT 3: EMAIL-SPAM-CHECKER (✅ EDGE PERFECT) ===
async function runEmailSpamCheckerAgent(
  result: Omit<DefenseResult, "timestamp" | "_id">,
  parsedEmail: ParsedMail
) {
  const agent: AgentStatus = {
    id: "email-spam-checker",
    name: "Threat Heuristics",
    description: "Spam/phishing/malware detection",
    status: "processing",
    progress: 0,
  };

  result.agents.push(agent);
  addTimelineEvent(result, "Heuristic scanning started", agent.name);

  try {
    agent.progress = 50;

    // ✅ SIMPLE, EDGE-COMPATIBLE SPAM CHECK
    const subjectSpam = await checkEmailSpam(parsedEmail.subject || "");
    const bodyText = (parsedEmail.text || "") + " " + (parsedEmail.html || "");
    const bodySpam = await checkEmailSpam(bodyText);

    const totalScore = (subjectSpam.isSpam ? 5 : 0) + (bodySpam.isSpam ? 5 : 0);

    agent.progress = 100;
    agent.status = "complete";
    agent.result = JSON.stringify({
      subjectSpam: subjectSpam.isSpam,
      bodySpam: bodySpam.isSpam,
      totalScore,
      reasons: [...subjectSpam.reasons, ...bodySpam.reasons],
    });

    result.overallRisk += totalScore * 6;

    const findingType =
      totalScore > 6
        ? ("critical" as const)
        : totalScore > 3
        ? ("warning" as const)
        : ("info" as const);

    result.findings.push({
      agent: agent.name,
      type: findingType,
      message: `Threat score: ${totalScore}/10`,
      details: `Subject: ${subjectSpam.isSpam ? "SPAM" : "OK"} | Body: ${
        bodySpam.isSpam ? "SPAM" : "OK"
      }`,
    });
  } catch (error) {
    agent.status = "error";
  }
}

// === HELPERS (UNCHANGED) ===
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
      category: "Email Structure",
      risk: Math.min(result.overallRisk * 0.2, 20),
      threats: 1,
    },
    {
      category: "Sender Validation",
      risk: Math.min(result.overallRisk * 0.3, 30),
      threats: 1,
    },
    {
      category: "Threat Heuristics",
      risk: Math.min(result.overallRisk * 0.5, 50),
      threats: 1,
    },
  ];
}

function generateRemediationSteps(
  result: Omit<DefenseResult, "timestamp" | "_id">
) {
  const steps = ["1. Quarantine the email", "2. Block sender domain"];
  if (result.severity === "critical") {
    steps.push("3. Alert security team");
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

export async function analyzeEmail(data: any) {
  return analyzeThreat(data);
}

export default analyzeEmail;
