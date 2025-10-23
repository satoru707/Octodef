import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DefenseResult, DefenseSession, ThreatInput } from '../types/types';
import { generateMockDefenseResult } from "../lib/mockData";
import axios from "axios";

// ✅ BUILD SAFETY: Skip queries during build
const isClient = typeof window !== "undefined";

const defendThreat = async (input: ThreatInput): Promise<DefenseResult> => {
  const response = await axios.post(`/api/defend`, JSON.stringify(input));
  return response.data;
};

const simulateAttack = async (): Promise<DefenseResult> => {
  const types: ThreatInput["type"][] = ["url", "ip", "hash", "log", "email"];
  const randomType = types[Math.floor(Math.random() * types.length)];
  const mockData = {
    url: "https://malicious-phishing-site.evil/steal-credentials",
    ip: "203.0.113.42",
    hash: "e99a18c428cb38d5f260853678922e03",
    log: '{"event":"unauthorized_access","source":"192.168.1.50","timestamp":"2025-10-18T12:34:56Z"}',
    email:
      "From: ceo@company-fake.com\nSubject: URGENT: Wire Transfer Required",
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

const fetchPastSessions = async (): Promise<DefenseSession[]> => {
  const response = await axios.get(`/api/session`);
  const past_collections = response.data.map((col: DefenseResult) => ({
    _id: col._id,
    timestamp: col.timestamp,
    input: col.input,
    status: col.status || "complete",
    overallRisk: col.overallRisk,
    severity: col.severity,
  })) as DefenseSession[];
  return past_collections;
};

const fetchSessionDetails = async (
  id: string
): Promise<DefenseResult | null> => {
  const response = await axios.get(`/api/session/${id}`);
  return response.data;
};

const deleteSessions = async (sessionIds: string[]): Promise<void> => {
  await axios.delete(`/api/session`, {
    data: { sessionIds },
  });
};

export const useDefendMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: defendThreat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pastSessions"] });
    },
  });
};

export const useSimulateAttackMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: simulateAttack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pastSessions"] });
    },
  });
};

// ✅ FIXED: SKIP DURING BUILD
export const usePastSessions = () => {
  return useQuery({
    queryKey: ["pastSessions"],
    queryFn: fetchPastSessions,
    staleTime: 5 * 60 * 1000,
    enabled: isClient, // ✅ BUILD SAFETY
  });
};

// ✅ FIXED: SKIP DURING BUILD
export const useSessionDetails = (id: string) => {
  return useQuery({
    queryKey: ["session", id],
    queryFn: () => fetchSessionDetails(id),
    staleTime: 10 * 60 * 1000,
    enabled: isClient && !!id, // ✅ BUILD SAFETY
  });
};

export const useDeleteSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pastSessions"] });
    },
  });
};