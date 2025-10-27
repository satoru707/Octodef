export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Session } from "@/types/types";
import { analyzeThreat } from "@/lib/defense_orcestrator";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";

export async function GET() {
  try {
    const { user } = (await auth()) as Session;
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { defenseResultCollection } = await getCollections();
    const results = await defenseResultCollection
      .find({ userId: user.email })
      .sort({ timestamp: -1 })
      .toArray();
    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: "Error fetching results" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { data, type } = await req.json();
    const { user } = (await auth()) as Session;
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const resultData = await analyzeThreat(data, type);

    const { defenseResultCollection } = await getCollections();
    const response = await defenseResultCollection.insertOne({
      ...resultData,
      timestamp: new Date().toISOString(),
      userId: user.email,
    });

    return NextResponse.json({
      ...resultData,
      timestamp: new Date().toISOString(),
      userId: user.email,
      _id: response.insertedId,
    });
  } catch {
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

    const { defenseResultCollection } = await getCollections();

    const response = await defenseResultCollection.deleteMany({
      _id: { $in: validSessionIds },
      userId: user.email,
    });

    return NextResponse.json({
      success: true,
      deletedCount: response.deletedCount,
      message: `${response.deletedCount} session(s) deleted successfully`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete sessions" },
      { status: 500 }
    );
  }
}
