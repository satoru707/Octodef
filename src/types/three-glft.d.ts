declare module "three/examples/jsm/loaders/GLTFLoader" {
  import { LoadingManager } from "three";
  import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
  export class GLTFLoader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
  }
  export interface GLTF {
    scene: THREE.Scene;
    scenes: THREE.Scene[];
    animations: THREE.AnimationClip[];
    cameras: THREE.Camera[];
    asset: object;
  }
}