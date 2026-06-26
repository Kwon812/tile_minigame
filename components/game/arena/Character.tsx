"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Cute jelly character: a glossy rounded body with a little face (eyes, nose,
 * smile). The body mesh + material are driven by the parent (hop + fade), while
 * this component adds a continuous squash-stretch "jelly" wobble of its own.
 *
 * `bodyRef`/`matRef` are owned by the parent so its per-frame hop and
 * elimination fade keep working unchanged.
 */
export function Character({
  bodyRef,
  matRef,
  color,
  emissiveIntensity = 0.22,
}: {
  bodyRef: React.RefObject<THREE.Mesh | null>;
  matRef: React.RefObject<THREE.MeshStandardMaterial | null>;
  color: string;
  emissiveIntensity?: number;
}) {
  // Random phase so characters don't all wobble in lockstep.
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    const b = bodyRef.current;
    if (!b) return;
    // Gentle breathing squash — volume-preserving so it reads as soft jelly.
    const s = Math.sin(state.clock.elapsedTime * 3 + phase.current) * 0.06;
    b.scale.set(1 + s, 1 - s, 1 + s);
  });

  return (
    <mesh ref={bodyRef} castShadow position={[0, 1, 0]}>
      {/* Chubby rounded body */}
      <capsuleGeometry args={[0.45, 0.5, 8, 16]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.18}
        metalness={0}
        transparent
      />

      {/* ---- face (children ride along with the body's wobble/hop) ---- */}
      {/* Eyes: white sphere + dark pupil + tiny highlight */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.17, 0.13, 0.33]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.09]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#241b1b" roughness={0.4} />
          </mesh>
          <mesh position={[0.03, 0.04, 0.13]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}

      {/* Nose: small pink button */}
      <mesh position={[0, 0.0, 0.45]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#f9a8d4" roughness={0.35} />
      </mesh>

      {/* Mouth: a little upward smile (half torus) */}
      <mesh position={[0, -0.13, 0.42]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.09, 0.025, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#7a2e3a" roughness={0.5} />
      </mesh>

      {/* Rosy cheeks for extra cuteness */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.28, -0.04, 0.3]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial
            color="#fb7185"
            transparent
            opacity={0.5}
            roughness={0.6}
          />
        </mesh>
      ))}
    </mesh>
  );
}
