import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DefenseResult, DefenseSession, ThreatInput } from '../types/types';
import { generateMockDefenseResult } from "../lib/mockData";
import { defenseResultCollection } from "./collection";

// Simulate API call
const defendThreat = async (input: ThreatInput): Promise<DefenseResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockDefenseResult(input));
    }, 8000); // 8 seconds to simulate 8 agents processing
  });
};

const simulateAttack = async (): Promise<DefenseResult> => {
  const types: ThreatInput['type'][] = ['url', 'ip', 'hash', 'log', 'email'];
  const randomType = types[Math.floor(Math.random() * types.length)];
  const mockData = {
    url: 'https://malicious-phishing-site.evil/steal-credentials',
    ip: '203.0.113.42',
    hash: 'e99a18c428cb38d5f260853678922e03',
    log: '{"event":"unauthorized_access","source":"192.168.1.50","timestamp":"2025-10-18T12:34:56Z"}',
    email: 'From: ceo@company-fake.com\nSubject: URGENT: Wire Transfer Required',
  };

  const input: ThreatInput = {
    type: randomType,
    data: mockData[randomType],
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockDefenseResult(input));
    }, 8000);
  });
};

// user user's id
const fetchPastSessions = async (): Promise<DefenseSession[]> => {
  const past_collections = await defenseResultCollection
    .find({ userId: "123" })
    .sort({ timestamp: -1 })
    .toArray();
  return past_collections.map((col: DefenseResult) => ({
    _id: col._id,
    timestamp: col.timestamp,
    input: col.input,
    status: col.status || "complete",
    overallRisk: col.overallRisk,
    severity: col.severity,
  }));
};

const fetchSessionDetails = async (
  id: string
): Promise<DefenseResult | null> => {
  const collection = await defenseResultCollection.findOne({ _id: id });
  return collection;
};

export const useDefendMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: defendThreat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastSessions'] });
    },
  });
};

export const useSimulateAttackMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: simulateAttack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastSessions'] });
    },
  });
};

export const usePastSessions = () => {
  return useQuery({
    queryKey: ['pastSessions'],
    queryFn: fetchPastSessions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSessionDetails = (id: string) => {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSessionDetails(id),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!id,
  });
};
