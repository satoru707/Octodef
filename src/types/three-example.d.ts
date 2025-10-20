declare module "three/examples/jsm/controls/OrbitControls" {
  import { Camera, Event } from "three";
  export class OrbitControls {
    constructor(object: Camera, domElement: HTMLElement);
    object: Camera;
    domElement: HTMLElement;
    enableDamping: boolean;
    dampingFactor: number;
    minDistance: number;
    maxDistance: number;
    update(): void;
    dispose(): void;
    addEventListener(type: string, listener: (event: Event) => void): void;
    removeEventListener(type: string, listener: (event: Event) => void): void;
  }
}

declare module "three/examples/jsm/postprocessing/EffectComposer" {
  import { WebGLRenderer } from "three";
  export class EffectComposer {
    constructor(renderer: WebGLRenderer, renderTarget);
    render(): void;
    setSize(width: number, height: number): void;
    addPass(pass): void;
    dispose(): void;
  }
}

declare module "three/examples/jsm/postprocessing/RenderPass" {
  import { Scene, Camera } from "three";
  export class RenderPass {
    constructor(scene: Scene, camera: Camera);
  }
}

declare module "three/examples/jsm/postprocessing/UnrealBloomPass" {
  import { Vector2 } from "three";
  export class UnrealBloomPass {
    constructor(resolution: Vector2, strength: number, radius: number, threshold: number);
    render(): void;
    threshold: number;
    strength: number;
    radius: number;
  }
}