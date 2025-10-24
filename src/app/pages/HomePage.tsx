"use client";
import { useState, useEffect, useRef } from "react";
import type { Session } from "next-auth";
import Link from "next/link";
import { Zap, Brain, Lock, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "next-auth/react";
import { OctoDefenderLogo } from "@/components/OctoDefenderLogo";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Shield } from "@phosphor-icons/react";

export const HomePage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef(null);
  const agentsRef = useRef(null);
  const ctaRef = useRef(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const octopusRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | null>(null);

  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const featuresInView = useInView(featuresRef, {
    once: true,
    margin: "-100px",
  });
  const agentsInView = useInView(agentsRef, { once: true, margin: "-100px" });
  const ctaInView = useInView(ctaRef, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll({ target: heroRef });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  useEffect(() => {
    async function fetchSession() {
      const session = await getSession();
      setSession(session);
    }
    fetchSession();
  }, []);

  useEffect(() => {
    if (!heroRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 10, 120);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.pointerEvents = "none";
    const canvasContainer = document.createElement("div");
    canvasContainer.style.position = "absolute";
    canvasContainer.style.top = "0";
    canvasContainer.style.left = "0";
    canvasContainer.style.width = "100%";
    canvasContainer.style.height = "100%";
    canvasContainer.style.zIndex = "0";
    heroRef.current.appendChild(canvasContainer);
    canvasContainer.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(20, 30, 20);
    scene.add(ambientLight, dirLight);

    const loader = new GLTFLoader();
    loader.load(
      "/models/octopus/scene.gltf",
      (gltf) => {
        const oct = gltf.scene;
        oct.scale.set(1.2, 1.2, 1.2);
        oct.position.set(0, -10, -40);

        oct.rotation.x = -Math.PI / 2;
        oct.rotation.y = Math.PI;

        scene.add(oct);
        octopusRef.current = oct;

        oct.traverse((child: THREE.Mesh | THREE.Sprite) => {
          if (child.name.toLowerCase().includes("eye")) {
            child.position.set(0, 0.5, 1.5);
            child.scale.set(1.2, 1.2, 1.2);
          }
        });

        const wanderRadius = { x: 55, y: 30, z: 25 };
        const wanderSpeed = 0.05;
        const bodyLerp = 0.06;
        const rotationSlerp = 0.07;
        const tentacleGlobalSpeed = 0.9;
        const tentacleGlobalAmplitude = 0.25;

        const velocity = new THREE.Vector3();
        const tempVec = new THREE.Vector3();
        let lastTime = performance.now();

        const shoulders: THREE.Object3D[] = [];
        oct.traverse((obj: THREE.Mesh | THREE.Sprite) => {
          const n = (obj.name || "").toLowerCase();
          if (
            n.includes("shoulder") ||
            n.includes("tentacle") ||
            n.includes("bone")
          ) {
            shoulders.push(obj);
          }
        });

        const tentacleChains = shoulders
          .map((s) => {
            const chain: THREE.Object3D[] = [];
            let cur: THREE.Object3D | undefined = s;
            while (cur) {
              chain.push(cur);
              const children: THREE.Object3D[] = cur.children || [];
              if (children.length === 0) break;
              let next = children.find((c) => /arm|bone|tent/i.test(c.name));
              if (!next) next = children[0];
              if (!next || chain.includes(next)) break;
              cur = next;
            }
            return chain;
          })
          .filter((c) => c.length > 1);

        const smoothTarget = (t: number) =>
          new THREE.Vector3(
            Math.sin(t * wanderSpeed * 0.8) * wanderRadius.x,
            Math.cos(t * wanderSpeed * 0.6) * wanderRadius.y,
            -40 + Math.sin(t * wanderSpeed * 0.7) * wanderRadius.z
          );

        const animate = () => {
          if (
            !rendererRef.current ||
            !cameraRef.current ||
            !octopusRef.current
          ) {
            animationRef.current = requestAnimationFrame(animate);
            return;
          }

          const now = performance.now();
          const dt = (now - lastTime) / 1000;
          lastTime = now;
          const time = now * 0.001;

          const target = smoothTarget(time);
          tempVec.copy(target).sub(oct.position);
          velocity.lerp(tempVec, Math.min(1, dt * 2.5));
          oct.position.lerp(tempVec.add(oct.position), bodyLerp);

          if (velocity.lengthSq() > 0.001) {
            const lookTarget = oct.position.clone().add(velocity);
            const m = new THREE.Matrix4();
            m.lookAt(oct.position, lookTarget, new THREE.Vector3(0, 1, 0));
            const targetQ = new THREE.Quaternion().setFromRotationMatrix(m);
            oct.quaternion.slerp(targetQ, rotationSlerp);
          }

          oct.rotation.z += Math.sin(time * 0.4) * 0.002;
          oct.rotation.y += Math.cos(time * 0.3) * 0.002;

          tentacleChains.forEach((chain, armIndex) => {
            const armPhase = armIndex * 0.4;
            chain.forEach((bone, i) => {
              const progress = i / (chain.length - 1);
              const amp = tentacleGlobalAmplitude * (1 - progress);
              const phase =
                time * tentacleGlobalSpeed - progress * 2.2 + armPhase;
              const rx = Math.sin(phase) * amp * 0.4;
              const rz = Math.cos(phase * 0.9) * amp * 0.4;

              const targetEuler = new THREE.Euler(rx, bone.rotation.y, rz);
              const curQ = bone.quaternion.clone();
              const targetQ = new THREE.Quaternion().setFromEuler(targetEuler);
              curQ.slerp(targetQ, 0.1);
              bone.quaternion.copy(curQ);
            });
          });

          rendererRef.current.render(scene, cameraRef.current);
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      },
      undefined,
      (err) => console.error("GLTF Load Error:", err)
    );

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      rendererRef.current?.dispose();
      sceneRef.current?.clear();
    };
  }, [heroInView]);

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
    <div className="min-h-screen bg-black overflow-hidden">
      <section
        ref={heroRef}
        className="relative overflow-hidden min-h-screen flex items-center"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-[#1e3a8a]/10 via-transparent to-transparent"
          style={{ y: parallaxY, opacity }}
        />
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, 100]) }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </motion.div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex justify-center mb-6"
            >
              <OctoDefenderLogo
                className="w-24 h-24"
                showText={false}
                animated={true}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-[#1e3a8a]/20 border border-[#1e3a8a]/30 rounded-full px-4 py-2"
            >
              <Sparkles className="w-4 h-4 text-[#10b981]" />
              <span className="text-sm text-gray-300">
                Advanced Cybersecurity Defense Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-5xl md:text-7xl text-white max-w-4xl mx-auto leading-tight"
            >
              Defense inspired by the{" "}
              <motion.span
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563eb] via-[#1e3a8a] to-[#10b981]"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                octopus
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
            >
              Harness the power of 8 AI agents working in perfect coordination
              to detect, analyze, and neutralize cyber threats in real-time with
              stunning 3D visualization.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
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
            </motion.div>
          </div>
        </div>
      </section>

      <section ref={featuresRef} className="py-24 border-t border-[#1e3a8a]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl text-white mb-4">
              Comprehensive Protection
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Built for security professionals who demand precision and speed
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="group bg-[#111] border border-[#1e3a8a]/20 rounded-xl p-6 hover:border-[#1e3a8a]/50 hover:bg-[#111]/80 transition-all duration-300"
              >
                <motion.div
                  className="bg-[#1e3a8a]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#1e3a8a]/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                >
                  <feature.icon className="w-6 h-6 text-[#2563eb]" />
                </motion.div>
                <h3 className="text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section ref={agentsRef} className="py-24 border-t border-[#1e3a8a]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={agentsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl text-white mb-4">8 Specialized Agents</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Each agent brings unique capabilities to create a comprehensive
              defense system
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={agentsInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group bg-[#111] border border-[#1e3a8a]/20 rounded-xl p-5 hover:border-[#10b981]/40 hover:bg-[#111]/80 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-8 h-8 rounded-full bg-[#065f46]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#065f46]/30 transition-colors"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white mb-0.5">{agent.name}</h4>
                    <p className="text-xs text-gray-400 truncate">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {!session && (
        <section ref={ctaRef} className="py-24 border-t border-[#1e3a8a]/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={ctaInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="relative bg-gradient-to-br from-[#1e3a8a]/20 to-[#065f46]/20 border border-[#1e3a8a]/30 rounded-2xl p-12 overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#1e3a8a]/10 via-transparent to-[#065f46]/10"
                animate={{ x: [0, -100, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />

              <div className="relative">
                <motion.div
                  initial={{ opacity: 0, rotate: -10 }}
                  animate={ctaInView ? { opacity: 1, rotate: 0 } : {}}
                  transition={{ duration: 0.6 }}
                  className="mb-6 flex justify-center"
                >
                  <OctoDefenderLogo
                    className="w-16 h-16"
                    showText={false}
                    animated={true}
                  />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={ctaInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-4xl text-white mb-4"
                >
                  Ready to defend?
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={ctaInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-gray-400 mb-8 max-w-2xl mx-auto"
                >
                  Join security teams worldwide using OctoDefender to stay ahead
                  of threats with AI-powered defense
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={ctaInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1e3a8a] text-white"
                  >
                    <Link href="/auth/signin">Sign In to Get Started</Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;