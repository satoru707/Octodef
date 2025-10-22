export const runtime = "nodejs";

import { DefenseResult } from "@/types/types";
import { analyzeThreat as url } from "./defense/url_defense";
import { analyzeThreat as email } from "./defense/email_defense";
import { analyzeThreat as ip } from "./defense/ip_defense";
import { analyzeThreat as log } from "./defense/logs_defense";
import { analyzeThreat as hash } from "./defense/hash_defense";

export async function analyzeURL(data: string) {
  const result = (await url(data)) as Omit<DefenseResult, "_id" | "timestamp">;
  console.log("Result", result);
  return JSON.stringify(result);
}

export async function analyzeIP(data: string) {
  const result = (await ip(data)) as Omit<DefenseResult, "_id" | "timestamp">;
  console.log("Result", result);
  return JSON.stringify(result);
}

export async function analyzeHash(data: string) {
  const result = (await hash(data)) as Omit<DefenseResult, "_id" | "timestamp">;
  console.log("Result", result);
  return JSON.stringify(result);
}

export async function analyzeEmail(data: string) {
  const result = await email(data);
  console.log("Result", result);
  return JSON.stringify(result);
}

export async function analyzeLog(data: string) {
  const result = (await log(data)) as Omit<DefenseResult, "_id" | "timestamp">;
  console.log("Result", result);
  return JSON.stringify(result);
}
