import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Session } from "@/types/types";
import { DefenseResult } from "@/types/types";
import {
  analyzeURL,
  analyzeIP,
  analyzeHash,
  analyzeLog,
  analyzeEmail,
} from "@/lib/defense";

export async function POST(req: NextRequest) {
  const { data, type } = await req.json();
  const { user } = (await auth()) as Session;
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let resultData;
  try {
    switch (type) {
      case "url":
        resultData = await analyzeURL(data);
        break;
      case "ip":
        resultData = await analyzeIP(data);
        break;
      case "hash":
        resultData = await analyzeHash(data);
        break;
      case "log":
        resultData = await analyzeLog(data);
        break;
      case "email":
        resultData = await analyzeEmail(data);
        break;
      default:
        throw new Error("Invalid threat type");
    }

    const defenseResult: DefenseResult = {
      _id: `def-${Date.now()}`,
      timestamp: new Date().toISOString(),
      input: { type, data },
      overallRisk: resultData.overallRisk,
      severity: resultData.severity,
      agents: resultData.agents,
      findings: resultData.findings,
      remediationSteps: resultData.remediationSteps,
      threatMap: resultData.threatMap,
      timeline: resultData.timeline,
      status: "complete",
    };

    return NextResponse.json(defenseResult);
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
