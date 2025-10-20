'use server'
import { db } from "./db";
import { AgentStatus, DefenseResult, DefenseSession } from "../types/types";

export interface User {
  _id: string;
  name: string;
  email: string;
  image: string;
  createdAt: string;
}

// remove id
export type DefenseResultProps = Omit<DefenseResult, "id">;
export type DefenseSessionProps = Omit<DefenseSession, "id">;

export const userCollection = db.collection<User>("users");
export const agentStatusCollection = db.collection<AgentStatus>("agentStatus");
export const defenseResultCollection =
  db.collection<DefenseResultProps>("defenseResults");
