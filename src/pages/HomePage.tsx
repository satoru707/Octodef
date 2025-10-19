"use client";
import { useState, useEffect } from "react";
import type { Session } from "next-auth";
import Link from "next/link";
import {
  Shield,
  Zap,
  Brain,
  Lock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "next-auth/react";
import { OctoDefenderLogo } from "@/components/OctoDefenderLogo";

export const HomePage = () => {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    async function fetchSession() {
      const session = await getSession();
      setSession(session);
    }
    fetchSession();
  }, []);

  const features = [
    {
      icon: Shield,
      title: "Multi-Agent Defense",
      description:
        "8 specialized AI agents work in parallel to analyze threats from every angle",
    },
    {
      icon: Brain,
      title: "Intelligent Analysis",
      description:
        "Machine learning algorithms detect patterns and anomalies in real-time",
    },
    {
      icon: Zap,
      title: "Real-Time Processing",
      description:
        "Instant threat assessment with live progress tracking and updates",
    },
    {
      icon: Lock,
      title: "Comprehensive Coverage",
      description: "Analyze URLs, IPs, hashes, network logs, and email headers",
    },
  ];

  const agents = [
    { name: "Scout", description: "Initial reconnaissance" },
    { name: "Sentinel", description: "Perimeter defense" },
    { name: "Analyst", description: "Deep analysis" },
    { name: "Isolator", description: "Threat containment" },
    { name: "Remediator", description: "Automated response" },
    { name: "Learner", description: "ML intelligence" },
    { name: "Alerter", description: "Real-time alerts" },
    { name: "Orchestrator", description: "Decision engine" },
  ];

  return (
    <div className="min-h-screen bg-black">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a8a]/10 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
          <div className="text-center space-y-8">
            <div className="flex justify-center mb-6">
              <OctoDefenderLogo
                className="w-24 h-24"
                showText={false}
                animated={true}
              />
            </div>

            <div className="inline-flex items-center gap-2 bg-[#1e3a8a]/20 border border-[#1e3a8a]/30 rounded-full px-4 py-2">
              <Sparkles className="w-4 h-4 text-[#10b981]" />
              <span className="text-sm text-gray-300">
                Advanced Cybersecurity Defense Platform
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl text-white max-w-4xl mx-auto leading-tight">
              Defense inspired by the{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563eb] via-[#1e3a8a] to-[#10b981]">
                octopus
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Harness the power of 8 AI agents working in perfect coordination
              to detect, analyze, and neutralize cyber threats in real-time with
              stunning 3D visualization.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!!session ? (
                <Button
                  asChild
                  size="lg"
                  className="bg-[#1e3a8a] hover:bg-[#2563eb] text-white"
                >
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1e3a8a] text-white"
                  >
                    <Link href="/auth/signin">Get Started</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-[#333] text-white hover:bg-[#1e3a8a]/10"
                  >
                    <Link href="/about">Learn More</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-[#1e3a8a]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-white mb-4">
              Comprehensive Protection
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Built for security professionals who demand precision and speed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group bg-[#111] border border-[#1e3a8a]/20 rounded-xl p-6 hover:border-[#1e3a8a]/50 hover:bg-[#111]/80 transition-all duration-300"
              >
                <div className="bg-[#1e3a8a]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#1e3a8a]/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-[#2563eb]" />
                </div>
                <h3 className="text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-[#1e3a8a]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-white mb-4">8 Specialized Agents</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Each agent brings unique capabilities to create a comprehensive
              defense system
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent, idx) => (
              <div
                key={idx}
                className="group bg-[#111] border border-[#1e3a8a]/20 rounded-xl p-5 hover:border-[#10b981]/40 hover:bg-[#111]/80 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#065f46]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#065f46]/30 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white mb-0.5">{agent.name}</h4>
                    <p className="text-xs text-gray-400 truncate">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!session && (
        <section className="py-24 border-t border-[#1e3a8a]/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="relative bg-gradient-to-br from-[#1e3a8a]/20 to-[#065f46]/20 border border-[#1e3a8a]/30 rounded-2xl p-12 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a8a]/10 via-transparent to-[#065f46]/10 animate-pulse" />

              <div className="relative">
                <div className="mb-6 flex justify-center">
                  <OctoDefenderLogo
                    className="w-16 h-16"
                    showText={false}
                    animated={true}
                  />
                </div>
                <h2 className="text-4xl text-white mb-4">Ready to defend?</h2>
                <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                  Join security teams worldwide using OctoDefender to stay ahead
                  of threats with AI-powered defense
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1e3a8a] text-white"
                >
                  <Link href="/auth/signin">Sign In to Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
