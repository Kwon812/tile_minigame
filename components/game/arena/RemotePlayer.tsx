"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PlayerView } from "@/lib/types";
import { FALL_Y, playerColor } from "./shared";
import { NameTag } from "./NameTag";

export function RemotePlayer({ player }: { player: PlayerView }) {
  const ref = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  // Position is driven ONLY here (no declarative `position` prop) so React
  // re-renders between rounds can't reset the group to a stale/origin value
  // and fight the interpolation.
  const placed = useRef(false);

  const capsuleRef = useRef<THREE.Mesh>(null);
  const prev = useRef(new THREE.Vector3(player.x, 0, player.z));

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;

    const targetY = player.alive ? player.y : FALL_Y;

    // First frame: snap exactly to the server position (avoids an origin flash).
    if (!placed.current) {
      g.position.set(player.x, targetY, player.z);
      placed.current = true;
    }

    // X/Z follow the server position; Y drops when eliminated so the character
    // falls together with its wrong tile and vanishes.
    g.position.x = THREE.MathUtils.damp(g.position.x, player.x, 10, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, player.z, 10, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, 3.5, delta);
    g.rotation.y = player.rotationY;
    // Tip over while falling when eliminated.
    g.rotation.z = THREE.MathUtils.damp(
      g.rotation.z,
      player.alive ? 0 : 1.4,
      4,
      delta
    );

    // Hop animation: stronger while actually moving.
    const speed = prev.current.distanceTo(g.position) / Math.max(delta, 0.001);
    prev.current.copy(g.position);
    if (capsuleRef.current && player.alive) {
      const amp = speed > 1 ? 0.32 : 0.04;
      const rate = speed > 1 ? 15 : 2.5;
      capsuleRef.current.position.y =
        1 + Math.abs(Math.sin(state.clock.elapsedTime * rate)) * amp;
    }

    if (matRef.current) {
      matRef.current.opacity = THREE.MathUtils.damp(
        matRef.current.opacity,
        player.alive ? 1 : 0,
        3,
        delta
      );
    }
  });

  return (
    <group ref={ref}>
      <mesh ref={capsuleRef} castShadow position={[0, 1, 0]}>
        <capsuleGeometry args={[0.4, 1, 6, 12]} />
        <meshStandardMaterial
          ref={matRef}
          color={player.connected ? playerColor(player.color) : "#9ca3af"}
          transparent
        />
      </mesh>
      {player.alive && <NameTag name={player.nickname} isSelf={false} />}
    </group>
  );
}
