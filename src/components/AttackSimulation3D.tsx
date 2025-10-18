import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { CustomPointsType } from "@/types/types";

interface AttackSimulation3DProps {
  isActive: boolean;
  onComplete?: () => void;
}

export const AttackSimulation3D = ({
  isActive,
  onComplete,
}: AttackSimulation3DProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Attack particles and tentacles
  const attackParticlesRef = useRef<THREE.Points[]>([]);
  const tentaclesRef = useRef<THREE.Mesh[]>([]);
  const centerOctopusRef = useRef<THREE.Group | null>(null);
  const explosionsRef = useRef<THREE.Points[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 50, 200);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    camera.position.y = 10;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x2563eb, 2, 100);
    pointLight1.position.set(0, 0, 0);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x10b981, 1.5, 80);
    pointLight2.position.set(20, 20, 20);
    scene.add(pointLight2);

    // Create central octopus
    const octopusGroup = new THREE.Group();

    // Octopus body (central sphere)
    const bodyGeometry = new THREE.SphereGeometry(3, 32, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x1e3a8a,
      emissive: 0x2563eb,
      emissiveIntensity: 0.3,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    octopusGroup.add(body);

    // Inner glow sphere
    const glowGeometry = new THREE.SphereGeometry(3.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.2,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    octopusGroup.add(glow);

    // Create 8 tentacles
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;

      // Tentacle curve
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
          Math.cos(angle) * 5,
          Math.sin(angle) * 5,
          Math.random() * 2 - 1
        ),
        new THREE.Vector3(
          Math.cos(angle) * 12,
          Math.sin(angle) * 12,
          Math.random() * 4 - 2
        ),
        new THREE.Vector3(
          Math.cos(angle) * 18,
          Math.sin(angle) * 18,
          Math.random() * 6 - 3
        ),
      ]);

      const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.3, 8, false);
      const tubeMaterial = new THREE.MeshPhongMaterial({
        color: 0x065f46,
        emissive: 0x10b981,
        emissiveIntensity: 0.4,
        shininess: 80,
        transparent: true,
        opacity: 0.8,
      });
      const tentacle = new THREE.Mesh(tubeGeometry, tubeMaterial);
      octopusGroup.add(tentacle);
      tentaclesRef.current.push(tentacle);

      // Tentacle tip sphere
      const tipGeometry = new THREE.SphereGeometry(0.6, 16, 16);
      const tipMaterial = new THREE.MeshPhongMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.6,
      });
      const tip = new THREE.Mesh(tipGeometry, tipMaterial);
      tip.position.set(
        Math.cos(angle) * 18,
        Math.sin(angle) * 18,
        Math.random() * 6 - 3
      );
      octopusGroup.add(tip);
    }

    scene.add(octopusGroup);
    centerOctopusRef.current = octopusGroup;

    // Create attack particles (threats)
    const createAttackWave = () => {
      const particleCount = 100;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities: THREE.Vector3[] = [];

      for (let i = 0; i < particleCount; i++) {
        // Start particles from random positions outside
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 60 + Math.random() * 20;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);

        // Velocity towards center
        const direction = new THREE.Vector3(
          -positions[i * 3],
          -positions[i * 3 + 1],
          -positions[i * 3 + 2]
        ).normalize();
        velocities.push(direction.multiplyScalar(0.3 + Math.random() * 0.3));
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

      const material = new THREE.PointsMaterial({
        color: 0xff0000,
        size: 0.8,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });

      const particles = new THREE.Points(
        geometry,
        material
      ) as CustomPointsType;
      particles.velocities = velocities;
      particles.createdAt = Date.now();
      scene.add(particles);
      attackParticlesRef.current.push(particles);

      return particles;
    };

    // Create explosion effect
    const createExplosion = (position: THREE.Vector3) => {
      const particleCount = 30;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities: THREE.Vector3[] = [];

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;

        // Random outward velocity
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );
        velocities.push(vel);
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

      const material = new THREE.PointsMaterial({
        color: 0x10b981,
        size: 1.2,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });

      const explosion = new THREE.Points(
        geometry,
        material
      ) as CustomPointsType;
      explosion.velocities = velocities;
      explosion.createdAt = Date.now();
      explosion.life = 1000; // milliseconds
      scene.add(explosion);
      explosionsRef.current.push(explosion);
    };

    // Grid helper for depth perception
    const gridHelper = new THREE.GridHelper(100, 20, 0x1e3a8a, 0x111111);
    gridHelper.position.y = -20;
    scene.add(gridHelper);

    // Animation loop
    let lastAttackTime = Date.now();
    const rotationSpeed = 0.002;

    const animate = () => {
      if (isPaused) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Rotate octopus
      if (centerOctopusRef.current) {
        centerOctopusRef.current.rotation.y += rotationSpeed;

        // Pulse animation
        const scale = 1 + Math.sin(Date.now() * 0.003) * 0.05;
        centerOctopusRef.current.scale.set(scale, scale, scale);
      }

      // Create new attack waves
      if (isActive && Date.now() - lastAttackTime > 2000) {
        createAttackWave();
        lastAttackTime = Date.now();
      }

      // Update attack particles
      attackParticlesRef.current = attackParticlesRef.current.filter(
        (particles) => {
          const positions = particles.geometry.attributes.position
            .array as Float32Array;
          const velocities = particles.velocities as THREE.Vector3[];
          let particlesAlive = 0;

          for (let i = 0; i < positions.length / 3; i++) {
            const idx = i * 3;

            // Update position
            positions[idx] += velocities[i].x;
            positions[idx + 1] += velocities[i].y;
            positions[idx + 2] += velocities[i].z;

            // Check if particle reached center (intercepted)
            const distance = Math.sqrt(
              positions[idx] ** 2 +
                positions[idx + 1] ** 2 +
                positions[idx + 2] ** 2
            );

            if (distance < 15) {
              // Create explosion
              createExplosion(
                new THREE.Vector3(
                  positions[idx],
                  positions[idx + 1],
                  positions[idx + 2]
                )
              );
              // Reset particle far away (remove it)
              positions[idx] = 1000;
              positions[idx + 1] = 1000;
              positions[idx + 2] = 1000;
            } else if (distance < 100) {
              particlesAlive++;
            }
          }

          particles.geometry.attributes.position.needsUpdate = true;

          // Remove if all particles are dead or too old
          const age = Date.now() - (particles as any).createdAt;
          if (particlesAlive === 0 || age > 10000) {
            scene.remove(particles);
            particles.geometry.dispose();
            (particles.material as THREE.Material).dispose();
            return false;
          }

          return true;
        }
      );

      // Update explosions
      explosionsRef.current = explosionsRef.current.filter((explosion) => {
        const positions = explosion.geometry.attributes.position
          .array as Float32Array;
        const velocities = (explosion as any).velocities as THREE.Vector3[];
        const age = Date.now() - (explosion as any).createdAt;
        const life = (explosion as any).life;

        for (let i = 0; i < positions.length / 3; i++) {
          const idx = i * 3;
          positions[idx] += velocities[i].x;
          positions[idx + 1] += velocities[i].y;
          positions[idx + 2] += velocities[i].z;
        }

        explosion.geometry.attributes.position.needsUpdate = true;

        // Fade out
        const material = explosion.material as THREE.PointsMaterial;
        material.opacity = Math.max(0, 1 - age / life);

        if (age > life) {
          scene.remove(explosion);
          explosion.geometry.dispose();
          material.dispose();
          return false;
        }

        return true;
      });

      // Animate tentacles
      tentaclesRef.current.forEach((tentacle, idx) => {
        const offset = (idx * Math.PI * 2) / 8;
        const wave = Math.sin(Date.now() * 0.002 + offset) * 0.3;
        tentacle.rotation.z = wave;
      });

      // Slow camera rotation
      camera.position.x = Math.sin(Date.now() * 0.0001) * 5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();

      // Dispose all geometries and materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, [isActive]);

  // Update pause state
  useEffect(() => {
    // Pause state is handled in the animation loop
  }, [isPaused]);

  const handleReset = () => {
    // Clear all attack particles
    attackParticlesRef.current.forEach((particles) => {
      if (sceneRef.current) {
        sceneRef.current.remove(particles);
      }
      particles.geometry.dispose();
      (particles.material as THREE.Material).dispose();
    });
    attackParticlesRef.current = [];

    // Clear all explosions
    explosionsRef.current.forEach((explosion) => {
      if (sceneRef.current) {
        sceneRef.current.remove(explosion);
      }
      explosion.geometry.dispose();
      (explosion.material as THREE.Material).dispose();
    });
    explosionsRef.current = [];
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-black rounded-lg overflow-hidden border border-[#1e3a8a]/30">
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-[#1e3a8a]/50 rounded-lg px-4 py-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsPaused(!isPaused)}
          className="text-white hover:bg-[#1e3a8a]/20"
        >
          {isPaused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          className="text-white hover:bg-[#1e3a8a]/20"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Info overlay */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm border border-[#1e3a8a]/50 rounded-lg px-4 py-3 max-w-xs">
        <h4 className="text-white mb-1 text-sm">Live Attack Simulation</h4>
        <p className="text-gray-400 text-xs">
          Red particles represent incoming threats. Watch as the
          OctoDefender&apos;s 8 tentacles intercept and neutralize each attack.
        </p>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm border border-[#1e3a8a]/50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-sm">
            Threats: {attackParticlesRef.current.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white text-sm">
            Intercepted: {explosionsRef.current.length}
          </span>
        </div>
      </div>
    </div>
  );
};
