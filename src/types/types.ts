import * as THREE from "three";
import {
  BufferGeometry,
  BufferGeometryEventMap,
  NormalBufferAttributes,
  PointsMaterial,
} from "three";

export interface CustomPointsType
  extends THREE.Points<
    BufferGeometry<NormalBufferAttributes, BufferGeometryEventMap>,
    PointsMaterial
  > {
  velocities: THREE.Vector3[];
  createdAt: number;
  life: number;
}
