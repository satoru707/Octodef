import { AgentStatus, DefenseResult, DefenseSession, Finding, ThreatMapData, TimelineEvent, ThreatInput } from '../types/types';

export const AGENTS: Omit<AgentStatus, 'status' | 'progress' | 'result'>[] = [
  {
    id: 'scout',
    name: 'Scout',
    description: 'Reconnaissance & initial threat detection',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    description: 'Perimeter defense & access control',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    description: 'Deep behavioral analysis & pattern recognition',
  },
  {
    id: 'isolator',
    name: 'Isolator',
    description: 'Threat containment & quarantine',
  },
  {
    id: 'remediator',
    name: 'Remediator',
    description: 'Automated response & recovery',
  },
  {
    id: 'learner',
    name: 'Learner',
    description: 'ML-based threat intelligence',
  },
  {
    id: 'alerter',
    name: 'Alerter',
    description: 'Real-time notification & escalation',
  },
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    description: 'Coordination & decision engine',
  },
];

export const generateMockDefenseResult = (input: ThreatInput): DefenseResult => {
  const risk = Math.floor(Math.random() * 100);
  const severity =
    risk < 30 ? "low" : risk < 60 ? "medium" : risk < 85 ? "high" : "critical";

  const findings: Finding[] = [
    {
      agent: "Scout",
      type: risk > 70 ? "critical" : "info",
      message: `Detected ${input.type} pattern matching known threat signatures`,
      details: "Multiple indicators suggest potential malicious activity",
    },
    {
      agent: "Analyst",
      type: risk > 60 ? "warning" : "info",
      message: "Behavioral analysis reveals anomalous patterns",
      details: "Communication with suspicious domains detected",
    },
    {
      agent: "Sentinel",
      type: "info",
      message: "Access control policies verified",
      details: "No unauthorized access attempts detected",
    },
  ];

  if (risk > 70) {
    findings.push({
      agent: "Isolator",
      type: "critical",
      message: "Immediate isolation recommended",
      details: "Threat level exceeds safe operational threshold",
    });
  }

  const threatMap: ThreatMapData[] = [
    {
      category: "Malware",
      risk: Math.floor(Math.random() * 100),
      threats: Math.floor(Math.random() * 20),
    },
    {
      category: "Phishing",
      risk: Math.floor(Math.random() * 100),
      threats: Math.floor(Math.random() * 15),
    },
    {
      category: "DDoS",
      risk: Math.floor(Math.random() * 100),
      threats: Math.floor(Math.random() * 10),
    },
    {
      category: "Data Breach",
      risk: Math.floor(Math.random() * 100),
      threats: Math.floor(Math.random() * 8),
    },
    {
      category: "Ransomware",
      risk: Math.floor(Math.random() * 100),
      threats: Math.floor(Math.random() * 12),
    },
  ];

  const timeline: TimelineEvent[] = AGENTS.map((agent, idx) => ({
    time: new Date(Date.now() - (AGENTS.length - idx) * 1000).toISOString(),
    agent: agent.name,
    event: `${agent.name} completed analysis`,
  }));

  const remediationSteps: string[] = [
    "Block suspicious IP addresses at firewall level",
    "Update threat signatures in IDS/IPS systems",
    "Quarantine affected endpoints immediately",
    "Initiate incident response protocol",
    "Notify security operations center (SOC)",
    "Document findings for compliance reporting",
  ];

  if (severity === "low") {
    remediationSteps.splice(
      2,
      2,
      "Monitor for 24 hours",
      "Update security policies"
    );
  }

  return {
    _id: `def-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // mongodb object id
    timestamp: new Date().toISOString(),
    input,
    overallRisk: risk,
    severity,
    agents: AGENTS.map((agent) => ({
      ...agent,
      status: "complete" as const,
      progress: 100,
      result: `${agent.name} analysis complete - ${
        risk > 50 ? "threats detected" : "all clear"
      }`,
    })),
    findings,
    remediationSteps,
    threatMap,
    timeline,
    status: "complete",
    userId: "random_user",
  };
};

export const mockPastSessions: DefenseSession[] = [
  {
    _id: "sess-001",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    input: {
      type: "url" as const,
      data: "https://suspicious-site.com/malware",
    },
    status: "complete" as const,
    overallRisk: 87,
    severity: "high" as const,
  },
  {
    _id: "sess-002",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    input: { type: "ip" as const, data: "192.168.1.100" },
    status: "complete" as const,
    overallRisk: 23,
    severity: "low" as const,
  },
  {
    _id: "sess-003",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    input: { type: "hash" as const, data: "5d41402abc4b2a76b9719d911017c592" },
    status: "complete" as const,
    overallRisk: 65,
    severity: "medium" as const,
  },
  {
    _id: "sess-004",
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    input: { type: "email" as const, data: "From: attacker@evil.com..." },
    status: "complete" as const,
    overallRisk: 92,
    severity: "critical" as const,
  },
];
