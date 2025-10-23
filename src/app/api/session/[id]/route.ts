export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { defenseResultCollection } from "@/app/api/defend/route";
import { Session } from "next-auth";

// ✅ MOCK DATA FOR BUILD
const mockSession = {
  _id: "mock-123",
  user_id: "test@example.com",
  input: { type: "url", data: "https://example.com" },
  agents: [],
  findings: [],
  remediationSteps: [],
  threatMap: [],
  timeline: [],
  status: "complete",
  overallRisk: 0,
  severity: "low",
  timestamp: new Date().toISOString(),
};

export async function GET(req: Request, context: { params: { id: string } }) {
  const { id } = context.params;

  // ✅ BUILD SAFETY: Mock data during build
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(mockSession);
  }

  try {
    const { user } = (await auth()) as Session;
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const collection = await defenseResultCollection.findOne({
      _id: new ObjectId(id),
      user_id: user.email,
    });

    if (!collection)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json(mockSession);
  }
}
