import { Shield, Cpu, Zap, Lock, Brain, Eye, Bell, Cog } from "lucide-react";

export const AboutPage = () => {
  const agents = [
    {
      icon: Eye,
      name: "Scout",
      description:
        "Performs initial reconnaissance and threat detection. Scouts the digital landscape for potential vulnerabilities and suspicious activity.",
    },
    {
      icon: Shield,
      name: "Sentinel",
      description:
        "Manages perimeter defense and access control. Acts as the first line of defense, blocking unauthorized access attempts.",
    },
    {
      icon: Brain,
      name: "Analyst",
      description:
        "Conducts deep behavioral analysis and pattern recognition. Uses advanced algorithms to identify anomalous behavior.",
    },
    {
      icon: Lock,
      name: "Isolator",
      description:
        "Handles threat containment and quarantine. Immediately isolates identified threats to prevent spread.",
    },
    {
      icon: Zap,
      name: "Remediator",
      description:
        "Executes automated response and recovery procedures. Implements fixes and patches to neutralize threats.",
    },
    {
      icon: Cpu,
      name: "Learner",
      description:
        "Applies machine learning-based threat intelligence. Continuously learns from new threats to improve detection.",
    },
    {
      icon: Bell,
      name: "Alerter",
      description:
        "Provides real-time notifications and escalation. Ensures security teams are immediately informed of critical issues.",
    },
    {
      icon: Cog,
      name: "Orchestrator",
      description:
        "Coordinates all agents and serves as the decision engine. Ensures all agents work in perfect harmony.",
    },
  ];

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#1e3a8a]/20 rounded-full mb-6">
            <Shield className="w-10 h-10 text-[#1e3a8a]" />
          </div>
          <h1 className="text-5xl text-white mb-4">About OctoDefender</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            A cybersecurity defense simulator inspired by the octopus—one of
            nature&apos;s most intelligent and adaptive creatures, capable of
            solving complex problems with multiple independent yet coordinated
            limbs.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <div className="bg-[#111] border border-[#1e3a8a]/30 rounded-lg p-8 md:p-12">
            <h2 className="text-3xl text-white mb-6">How It Works</h2>
            <div className="space-y-6 text-gray-300 leading-relaxed">
              <p>
                OctoDefender operates on a multi-agent architecture where eight
                specialized AI agents work in parallel to analyze potential
                cybersecurity threats. Each agent has a specific role and
                expertise, similar to how an octopus can perform multiple tasks
                simultaneously with its eight arms.
              </p>
              <p>
                When you submit threat data—whether it&apos;s a suspicious URL,
                IP address, file hash, network log, or email header—all eight
                agents immediately begin their analysis. They communicate
                findings, share intelligence, and coordinate responses through
                the Orchestrator agent.
              </p>
              <p>
                The system processes threats in real-time, providing instant
                feedback on risk levels, identifying vulnerabilities, and
                suggesting remediation steps. You can also use the simulation
                mode to test the system against synthetic attacks.
              </p>
            </div>
          </div>
        </div>

        {/* The 8 Agents */}
        <div className="mb-16">
          <h2 className="text-3xl text-white mb-8 text-center">The 8 Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents.map((agent, idx) => (
              <div
                key={idx}
                className="bg-[#111] border border-[#1e3a8a]/20 rounded-lg p-6 hover:border-[#1e3a8a]/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-[#1e3a8a]/10 w-12 h-12 rounded-lg flex items-center justify-center">
                    <agent.icon className="w-6 h-6 text-[#1e3a8a]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white mb-2">{agent.name}</h3>
                    <p className="text-gray-400 text-sm">{agent.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Octopus? */}
        <div className="bg-gradient-to-br from-[#1e3a8a]/20 to-[#065f46]/20 border border-[#1e3a8a]/30 rounded-lg p-8 md:p-12 text-center">
          <div className="text-6xl mb-6">🐙</div>
          <h2 className="text-3xl text-white mb-4">Why the Octopus?</h2>
          <p className="text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Octopi are masters of adaptation, problem-solving, and parallel
            processing. Each arm contains neurons that can act independently
            while remaining coordinated with the central brain. This biological
            marvel inspired our architecture—eight specialized agents that can
            analyze threats simultaneously while maintaining perfect
            synchronization through intelligent orchestration.
          </p>
        </div>

        {/* Credits */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            Built with Next.js, React Query, and advanced AI technologies
          </p>
          <p className="text-gray-600 text-xs mt-2">
            © {new Date().getFullYear()} OctoDefender. Protecting systems,
            inspired by nature.
          </p>
        </div>
      </div>
    </div>
  );
};
