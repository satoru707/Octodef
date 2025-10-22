export const runtime = "nodejs";

import { DefenseResult } from "@/types/types";
import { analyzeThreat as url } from "./defense/url_defense";
// import { analyzeThreat as email } from "./defense/email_defense";
import { analyzeThreat as ip } from "./defense/ip_defense";
// import { analyzeThreat as log } from "./defense/logs_defense";
// import { analyzeThreat as hash } from "./defense/hash_defense";

export async function analyzeURL(data: string) {
  const result = await url(data);
  return JSON.stringify(result);
}

export async function analyzeIP(data: string) {
  console.log(data);
  return await ip(data);
}

// export async function analyzeHash(data: string) {
//   console.log(data);
//   return (await hash(data)) as Omit<DefenseResult, "timestamp" | "_id">;
// }

// export async function analyzeEmail(data: string) {
//   console.log(data);
//   return (await email(data)) as Omit<DefenseResult, "timestamp" | "_id">;
// }

// export async function analyzeLog(data: string) {
//   console.log(data);
//   return (await log(data)) as Omit<DefenseResult, "timestamp" | "_id">;
// }
