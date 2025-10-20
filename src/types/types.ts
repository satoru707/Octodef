import * as THREE from "three";
import {
  BufferGeometry,
  BufferGeometryEventMap,
  NormalBufferAttributes,
  PointsMaterial,
} from "three";

export type ThreatType = 'url' | 'ip' | 'hash' | 'log' | 'email';

export interface ThreatInput {
  type: ThreatType;
  data: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  description: string;
  status: "idle" | "processing" | "complete" | "error";
  progress: number;
  result?: string;
  userId?: string;
}

export interface DefenseResult {
  _id: string;
  timestamp: string;
  input: ThreatInput;
  overallRisk: number;
  severity: "low" | "medium" | "high" | "critical";
  agents: AgentStatus[];
  findings: Finding[];
  remediationSteps: string[];
  threatMap: ThreatMapData[];
  timeline: TimelineEvent[];
  status: "pending" | "processing" | "complete" | "failed";
}

export interface Finding {
  agent: string;
  type: "info" | "warning" | "critical";
  message: string;
  details?: string;
}

export interface ThreatMapData {
  category: string;
  risk: number;
  threats: number;
}

export interface TimelineEvent {
  time: string;
  agent: string;
  event: string;
}

export interface DefenseSession {
  _id: string;
  timestamp: string;
  input: ThreatInput;
  status: "pending" | "processing" | "complete" | "failed";
  overallRisk?: number;
  severity?: "low" | "medium" | "high" | "critical";
  userId?: string;
}

export interface SessionProps {
  expires: string;
  provider: string
  user : {
    email: string
    image: string
    name: string
  }
}

export interface CustomPointsType
  extends THREE.Points<
    BufferGeometry<NormalBufferAttributes, BufferGeometryEventMap>,
    PointsMaterial
  > {
  velocities: THREE.Vector3[];
  createdAt: number;
  life: number;
}
