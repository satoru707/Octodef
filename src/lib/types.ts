export type ThreatType = 'url' | 'ip' | 'hash' | 'log' | 'email';

export interface ThreatInput {
  type: ThreatType;
  data: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'processing' | 'complete' | 'error';
  progress: number;
  result?: string;
}

export interface DefenseResult {
  id: string;
  timestamp: string;
  input: ThreatInput;
  overallRisk: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  agents: AgentStatus[];
  findings: Finding[];
  remediationSteps: string[];
  threatMap: ThreatMapData[];
  timeline: TimelineEvent[];
}

export interface Finding {
  agent: string;
  type: 'info' | 'warning' | 'critical';
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
  id: string;
  timestamp: string;
  input: ThreatInput;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  overallRisk?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}
