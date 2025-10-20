import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";
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
  const controlsRef = useRef<OrbitControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const clockRef = useRef(new THREE.Clock());

  const attackParticlesRef = useRef<CustomPointsType[]>([]);
  const tentaclesRef = useRef<THREE.Mesh[]>([]);
  const centerOctopusRef = useRef<THREE.Group | null>(null);
  const explosionsRef = useRef<CustomPointsType[]>([]);
  let lastFrameTime = Date.now();

  useEffect(() => {
    if (!containerRef.current || !isActive || !isMounted) {
      console.log("Skipping setup:", { containerRef: containerRef.current, isActive, isMounted });
      return;
    }
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    console.log("Container size on mount:", { width, height });
    if (width === 0 || height === 0) {
      console.error("Container has zero dimensions. Check parent CSS or visibility.");
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1a);
    scene.fog = new THREE.Fog(0x0a0f1a, 50, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 20, 50);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

const renderTarget = new THREE.WebGLRenderTarget(width, height);
const composer = new EffectComposer(renderer, renderTarget);
    composerRef.current = composer;
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.5;
    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
    const pointLight1 = new THREE.PointLight(0x2563eb, 2.5, 100);
    pointLight1.position.set(0, 20, 0);
    pointLight1.castShadow = true;
    pointLight1.shadow.mapSize.width = 1024;
    pointLight1.shadow.mapSize.height = 1024;
    const pointLight2 = new THREE.PointLight(0x10b981, 2, 80);
    pointLight2.position.set(20, 20, 20);
    pointLight2.castShadow = true;
    scene.add(ambientLight, pointLight1, pointLight2);

    const nebulaGeometry = new THREE.PlaneGeometry(500, 500);
    const nebulaMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0f1a,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
    });
    const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    nebula.position.z = -200;
    scene.add(nebula);

    const octopusGroup = new THREE.Group();
    const bodyGeometry = new THREE.IcosahedronGeometry(3, 2);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x1e3a8a,
      emissive: 0x2563eb,
      emissiveIntensity: 0.4,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    octopusGroup.add(body);

    const coreGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0xff4500,
      emissive: 0xff4500,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.7,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 0.5;
    octopusGroup.add(core);

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(angle) * 5, Math.sin(angle) * 5, Math.random() * 2 - 1),
        new THREE.Vector3(Math.cos(angle) * 12, Math.sin(angle) * 12, Math.random() * 4 - 2),
        new THREE.Vector3(Math.cos(angle) * 18, Math.sin(angle) * 18, Math.random() * 6 - 3),
      ]);
      const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.4, 12, false);
      const tubeMaterial = new THREE.MeshPhongMaterial({
        color: 0x065f46,
        emissive: 0x10b981,
        emissiveIntensity: 0.5,
        shininess: 80,
        transparent: true,
        opacity: 0.9,
      });
      const tentacle = new THREE.Mesh(tubeGeometry, tubeMaterial);
      tentacle.castShadow = true;
      tentacle.receiveShadow = true;
      octopusGroup.add(tentacle);
      tentaclesRef.current.push(tentacle);

      const tipGeometry = new THREE.SphereGeometry(0.7, 18, 18);
      const tipMaterial = new THREE.MeshPhongMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.7,
      });
      const tip = new THREE.Mesh(tipGeometry, tipMaterial);
      tip.position.copy(curve.getPoint(1));
      octopusGroup.add(tip);
    }
    scene.add(octopusGroup);
    centerOctopusRef.current = octopusGroup;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 100;
    controlsRef.current = controls;

    const gridHelper = new THREE.GridHelper(100, 20, 0x1e3a8a, 0x111111);
    gridHelper.position.y = -20;
    gridHelper.receiveShadow = true;
    scene.add(gridHelper);
    //   const particleCount = 150;
    //   const geometry = new THREE.BufferGeometry();
    //   const positions = new Float32Array(particleCount * 3);
    //   const colors = new Float32Array(particleCount * 3);
    //   const velocities: THREE.Vector3[] = [];
    //   const color = new THREE.Color();
    //   for (let i = 0; i < particleCount; i++) {
    //     const theta = Math.random() * Math.PI * 2;
    //     const phi = Math.random() * Math.PI;
    //     const radius = 60 + Math.random() * 20;
    //     positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    //     positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    //     positions[i * 3 + 2] = radius * Math.cos(phi);
    //     color.setHSL(Math.random(), 0.9, 0.5);
    //     colors[i * 3] = color.r;
    //     colors[i * 3 + 1] = color.g;
    //     colors[i * 3 + 2] = color.b;
    //     const direction = new THREE.Vector3(-positions[i * 3], -positions[i * 3 + 1], -positions[i * 3 + 2]).normalize();
    //     velocities.push(direction.multiplyScalar(0.3 + Math.random() * 0.3));
    //   }
    //   geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    //   geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    //   const material = new THREE.PointsMaterial({
    //     vertexColors: true,
    //     size: 1.2,
    //     transparent: true,
    //     opacity: 0.9,
    //     blending: THREE.AdditiveBlending,
    //   });
    //   const particles = new THREE.Points(geometry, material) as CustomPointsType;
    //   particles.velocities = velocities;
    //   particles.createdAt = Date.now();
    //   scene.add(particles);
    //   attackParticlesRef.current.push(particles);
    //   return particles;
    // };

    const createAttackWave = () => {
  const particleCount = 150;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const velocities: THREE.Vector3[] = [];
  const color = new THREE.Color();
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const radius = 60 + Math.random() * 20;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    // Favor red hues (0 to 0.1 in HSL hue range for red shades)
    color.setHSL(Math.random() * 0.1, 0.9, 0.5 + Math.random() * 0.3); // Red base with slight variation
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    const direction = new THREE.Vector3(-positions[i * 3], -positions[i * 3 + 1], -positions[i * 3 + 2]).normalize();
    velocities.push(direction.multiplyScalar(0.3 + Math.random() * 0.3));
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: 1.2,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(geometry, material) as CustomPointsType;
  particles.velocities = velocities;
  particles.createdAt = Date.now();
  scene.add(particles);
  attackParticlesRef.current.push(particles);
  return particles;
};
    const createExplosion = (position: THREE.Vector3) => {
      const particleCount = 50;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const scales = new Float32Array(particleCount);
      const velocities: THREE.Vector3[] = [];
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;
        const vel = new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        velocities.push(vel);
        scales[i] = Math.random() * 0.5 + 0.5;
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));
      const material = new THREE.PointsMaterial({
        color: 0x10b981,
        size: 1.5,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const explosion = new THREE.Points(geometry, material) as CustomPointsType;
      explosion.velocities = velocities;
      explosion.createdAt = Date.now();
      explosion.life = 1500;
      scene.add(explosion);
      explosionsRef.current.push(explosion);
    };

    const animate = () => {
      if (!isMounted || !rendererRef.current || !sceneRef.current || !cameraRef.current || !composerRef.current) return;

      const delta = clockRef.current.getDelta();
      const time = Date.now();
      const speedFactor = isSlowMotion ? 0.2 : 1.0;

      if (!isPaused) {
        if (centerOctopusRef.current) {
          centerOctopusRef.current.rotation.y += 0.001 * speedFactor;
          const scale = 1 + Math.sin(time * 0.002 * speedFactor) * 0.05;
          centerOctopusRef.current.scale.set(scale, scale, scale);
          const coreScale = 0.8 + Math.sin(time * 0.003 * speedFactor) * 0.1;
          (centerOctopusRef.current.children[1] as THREE.Mesh).scale.set(coreScale, coreScale, coreScale);
        }

        if (isActive && time - lastFrameTime > 1500 / speedFactor) {
          createAttackWave();
          lastFrameTime = time;
        }

        attackParticlesRef.current = attackParticlesRef.current.filter((particles) => {
          const positions = particles.geometry.attributes.position.array as Float32Array;
          const velocities = particles.velocities;
          let particlesAlive = 0;
          for (let i = 0; i < positions.length / 3; i++) {
            const idx = i * 3;
            positions[idx] += velocities[i].x * delta * speedFactor;
            positions[idx + 1] += velocities[i].y * delta * speedFactor;
            positions[idx + 2] += velocities[i].z * delta * speedFactor;
            const distance = Math.sqrt(positions[idx] ** 2 + positions[idx + 1] ** 2 + positions[idx + 2] ** 2);
            if (distance < 15) {
              createExplosion(new THREE.Vector3(positions[idx], positions[idx + 1], positions[idx + 2]));
              positions[idx] = 1000;
              positions[idx + 1] = 1000;
              positions[idx + 2] = 1000;
            } else if (distance < 100) {
              particlesAlive++;
            }
          }
          particles.geometry.attributes.position.needsUpdate = true;
          const age = time - particles.createdAt;
          if (particlesAlive === 0 || age > 10000 / speedFactor) {
            scene.remove(particles);
            particles.geometry.dispose();
            particles.material.dispose();
            return false;
          }
          return true;
        });

        explosionsRef.current = explosionsRef.current.filter((explosion) => {
          const positions = explosion.geometry.attributes.position.array as Float32Array;
          const velocities = explosion.velocities;
          const scales = explosion.geometry.attributes.scale.array as Float32Array;
          const age = time - explosion.createdAt;
          const life = explosion.life;
          for (let i = 0; i < positions.length / 3; i++) {
            const idx = i * 3;
            positions[idx] += velocities[i].x * delta * speedFactor;
            positions[idx + 1] += velocities[i].y * delta * speedFactor;
            positions[idx + 2] += velocities[i].z * delta * speedFactor;
            scales[i] = Math.max(0.1, scales[i] - 0.001 * delta * speedFactor);
          }
          explosion.geometry.attributes.position.needsUpdate = true;
          explosion.geometry.attributes.scale.needsUpdate = true;
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

        tentaclesRef.current.forEach((tentacle, idx) => {
          const offset = (idx * Math.PI * 2) / 8;
          const wave = Math.sin(time * 0.002 * speedFactor + offset) * 0.3;
          tentacle.rotation.z = wave;
        });

        camera.lookAt(0, 0, 0);
        controlsRef.current?.update();
        composer.render();
      }

      animationRef.current = requestAnimationFrame(animate);

      if (attackParticlesRef.current.length === 0 && explosionsRef.current.length === 0 && isActive) {
        if (onComplete) onComplete();
      }
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current || !composerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (containerRef.current && rendererRef.current?.domElement) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      [rendererRef, composerRef, controlsRef].forEach((ref) => {
        if (ref.current) {
          ref.current.dispose();
          ref.current = null;
        }
      });
      if (sceneRef.current) {
        sceneRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
          }
        });
        sceneRef.current = null;
      }
    };
  }, [isActive, isMounted]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0].contentRect.width > 0 && entries[0].contentRect.height > 0) {
        setIsMounted(true);
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-black rounded-lg overflow-hidden border border-[#1e3a8a]/30">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-[#1e3a8a]/50 rounded-lg px-4 py-2">
        <Button size="sm" variant="ghost" onClick={() => setIsPaused(!isPaused)} className="text-white hover:bg-[#1e3a8a]/20">
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { attackParticlesRef.current = []; explosionsRef.current = []; if (onComplete) onComplete(); }} className="text-white hover:bg-[#1e3a8a]/20">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsSlowMotion(!isSlowMotion)} className="text-white hover:bg-[#1e3a8a]/20">
          <Clock className="w-4 h-4" />
        </Button>
      </div>
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm border border-[#1e3a8a]/50 rounded-lg px-4 py-3 max-w-xs">
        <h4 className="text-white mb-1 text-sm">Live Attack Simulation</h4>
        <p className="text-gray-400 text-xs">
          Red particles represent incoming threats. Watch as the OctoDefender&apos;s enhanced tentacles neutralize them with stunning visuals.
        </p>
      </div>
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm border border-[#1e3a8a]/50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-sm">Threats: {attackParticlesRef.current.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white text-sm">Intercepted: {explosionsRef.current.length}</span>
        </div>
      </div>
    </div>
  );
};