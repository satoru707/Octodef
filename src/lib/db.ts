import { MongoClient, ServerApiVersion } from "mongodb";
import type { DefenseResult, User } from "@/types/types";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("Missing MONGODB_URI environment variable");

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db("octodef");
}

export async function getCollections() {
  const db = await getDb();
  return {
    defenseResultCollection: db.collection<DefenseResult>("defenseResults"),
    userCollection: db.collection<User>("users"),
  };
}
