export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DefenseResult, Session, User } from "@/types/types";
import {
  analyzeURL,
  analyzeIP,
  analyzeHash,
  analyzeLog,
  analyzeEmail,
} from "@/lib/defense";
import { db } from "@/lib/db";
import { ObjectId } from "mongodb";

export const defenseResultCollection =
  db.collection<DefenseResult>("defenseResults");
export const userCollection = db.collection<User>("users");

export async function GET() {
  try {
    console.log("1");
    const { user, provider } = (await auth()) as Session;
    console.log("2");
    console.log(user, provider);

    console.log("3");
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.log("4");
    const results = await defenseResultCollection
      .find({ user_id: user.email })
      .sort({ timestamp: -1 })
      .toArray();
    console.log("Results in get request", results);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Error fetching results" },
      { status: 500 }
    );
  }
}

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
    resultData = JSON.parse(resultData);
    console.log("Results", resultData);
    const response = await defenseResultCollection.insertOne({
      ...resultData,
      timestamp: new Date().toISOString(),
      user_id: user.email,
    });
    return NextResponse.json({
      ...resultData,
      timestamp: new Date().toISOString(),
      user_id: user.email,
      _id: response.insertedId,
    });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = (await auth()) as Session;
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionIds } = await request.json();

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "Session IDs array is required" },
        { status: 400 }
      );
    }
    const validSessionIds = sessionIds
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((id): id is ObjectId => id !== null);

    const response = await defenseResultCollection.deleteMany({
      _id: { $in: validSessionIds },
      user_id: user.email, // 🔒 Security
    });
    return NextResponse.json({
      success: true,
      deletedCount: response.deletedCount,
      message: `${response.deletedCount} session(s) deleted successfully`,
    });
  } catch (error: unknown) {
    console.error("Delete sessions error:", error);
    return NextResponse.json(
      { error: "Failed to delete sessions" },
      { status: 500 }
    );
  }
}