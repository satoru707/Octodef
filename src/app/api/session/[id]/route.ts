export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { Session } from "@/types/types";
import { defenseResultCollection } from "../../defend/route";

export async function GET(req: Request, context: { params: { id: string } }) {
  const { id } = await context.params;
  console.log("Got id at backend", id);

  const { user } = (await auth()) as Session;
  console.log("User exists", user);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await defenseResultCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!collection)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  console.log("Found collection", collection);
  return NextResponse.json(collection);
}
