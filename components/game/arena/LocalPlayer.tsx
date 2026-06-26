"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArenaConfig, PlayerView } from "@/lib/types";
import { PLAYER_SPEED, arenaBounds } from "@/lib/gameConfig";
import { usePressedKeys } from "@/hooks/usePressedKeys";
import type { MoveVec } from "../Joystick";
import { FALL_Y, playerColor, type MoveHandler } from "./shared";
import { NameTag } from "./NameTag";

export function LocalPlayer({
  arena,
  player,
  canMove,
  revealAt,
  moveVec,
  onMove,
}: {
  arena: ArenaConfig;
  player: PlayerView;
  canMove: boolean;
  revealAt: number | null;
  moveVec: React.MutableRefObject<MoveVec>;
  onMove: MoveHandler;
}) {
  const ref = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const capsuleRef = useRef<THREE.Mesh>(null);
  const pos = useRef(new THREE.Vector3(player.x, 0, player.z));
  const rotY = useRef(player.rotationY);
  const keys = usePressedKeys();
  const { camera } = useThree();
  const bounds = useMemo(() => arenaBounds(arena), [arena]);
  // Whether the player has given input THIS round. Until they do, we follow the
  // server's authoritative position (the respawn) instead of client prediction —
  // otherwise we'd keep sending last round's stale position and other clients
  // would see us snap back after the respawn.
  const movedThisRound = useRef(false);

  // Reset the input flag at every round boundary (canMove goes false between
  // rounds, then true when the next question starts).
  useEffect(() => {
    if (!canMove) movedThisRound.current = false;
  }, [canMove]);

  // Before any input this round, snap X/Z to the server position so the respawn
  // is reflected immediately and we don't transmit a stale position.
  useEffect(() => {
    if (!movedThisRound.current) {
      pos.current.x = player.x;
      pos.current.z = player.z;
    }
  }, [player.x, player.z]);

  // Send authoritative position 10x/sec while moving is allowed.
  useEffect(() => {
    if (!canMove) return;
    const id = setInterval(() => {
      onMove(pos.current.x, 0, pos.current.z, rotY.current);
    }, 100);
    return () => clearInterval(id);
  }, [canMove, onMove]);

  useFrame((state, delta) => {
    const k = keys.current;
    let dx = 0;
    let dz = 0;
    if (canMove) {
      if (k["KeyW"] || k["ArrowUp"]) dz -= 1;
      if (k["KeyS"] || k["ArrowDown"]) dz += 1;
      if (k["KeyA"] || k["ArrowLeft"]) dx -= 1;
      if (k["KeyD"] || k["ArrowRight"]) dx += 1;
      // Touch joystick (analog) adds on top of the keyboard.
      dx += moveVec.current.x;
      dz += moveVec.current.z;
    }
    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      movedThisRound.current = true; // input taken over — stop following server
      // Cap diagonal/combined speed at 1; keep analog magnitude below that so
      // a partial joystick push moves proportionally slower.
      const len = Math.hypot(dx, dz);
      if (len > 1) {
        dx /= len;
        dz /= len;
      }
      pos.current.x = THREE.MathUtils.clamp(
        pos.current.x + dx * PLAYER_SPEED * delta,
        bounds.minX,
        bounds.maxX
      );
      pos.current.z = THREE.MathUtils.clamp(
        pos.current.z + dz * PLAYER_SPEED * delta,
        bounds.minZ,
        bounds.maxZ
      );
      rotY.current = Math.atan2(dx, dz);
    }

    // Eliminated locals fall through their wrong tile and fade out.
    const targetY = player.alive ? 0 : FALL_Y;
    pos.current.y = THREE.MathUtils.damp(pos.current.y, targetY, 3.5, delta);

    if (ref.current) {
      ref.current.position.copy(pos.current);
      ref.current.rotation.y = rotY.current;
      ref.current.rotation.z = THREE.MathUtils.damp(
        ref.current.rotation.z,
        player.alive ? 0 : 1.4,
        4,
        delta
      );
    }
    // Hop animation while moving.
    if (capsuleRef.current && player.alive) {
      const amp = moving ? 0.32 : 0.04;
      const rate = moving ? 15 : 2.5;
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

    // Camera follow + reveal "impact" (brief zoom-out and shake).
    let shake = 0;
    if (revealAt) {
      const e = (performance.now() - revealAt) / 1000;
      if (e >= 0 && e < 0.6) shake = 1 - e / 0.6;
    }
    const zoom = shake * 5;
    const camTarget = new THREE.Vector3(
      pos.current.x,
      20 + zoom,
      pos.current.z + 18 + zoom
    );
    camera.position.lerp(camTarget, 1 - Math.pow(0.001, delta));
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake * 1.4;
      camera.position.y += (Math.random() - 0.5) * shake * 1.4;
    }
    camera.lookAt(pos.current.x, 0, pos.current.z);
  });

  return (
    <group ref={ref} position={[player.x, 0, player.z]}>
      <mesh ref={capsuleRef} castShadow position={[0, 1, 0]}>
        <capsuleGeometry args={[0.4, 1, 6, 12]} />
        <meshStandardMaterial
          ref={matRef}
          color={playerColor(player.color)}
          emissive={playerColor(player.color)}
          emissiveIntensity={0.35}
          transparent
        />
      </mesh>
      {player.alive && <NameTag name={player.nickname} isSelf />}
    </group>
  );
}
