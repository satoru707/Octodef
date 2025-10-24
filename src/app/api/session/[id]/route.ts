export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { Session } from "@/types/types";
import { getCollections } from "@/lib/db";

export async function GET({
  params,
}: {
  params: { id: string };
}): Promise<NextResponse> {
  try {
    const { id } = params;

    const session = (await auth()) as Session | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { defenseResultCollection } = await getCollections();
    const result = await defenseResultCollection.findOne({
      _id: new ObjectId(id),
      user_id: session.user.email,
    });
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}