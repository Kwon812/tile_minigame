"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Fixed overhead camera for admin spectators (board is centered on origin). */
export function SpectatorCamera() {
  const { camera } = useThree();
  useFrame((_, delta) => {
    camera.position.lerp(
      new THREE.Vector3(0, 30, 24),
      1 - Math.pow(0.001, delta)
    );
    camera.lookAt(0, 0, 0);
  });
  return null;
}
