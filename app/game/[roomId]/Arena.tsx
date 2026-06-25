"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArenaConfig, PlayerView } from "@/lib/types";
import {
  PLAYER_SPEED,
  PLAYER_COLORS,
  ZONE_COLORS,
  arenaBounds,
  tileCenter,
} from "@/lib/gameConfig";

const playerColor = (i: number) =>
  PLAYER_COLORS[((i % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length];

export interface SceneProps {
  arena: ArenaConfig;
  players: PlayerView[];
  selfId: string | null;
  /** Player may move (active question phase). */
  canMove: boolean;
  /** Correct zone index once revealed, else null. */
  correctAnswer: number | null;
  /** Timestamp (ms) the answer was revealed, for the camera impact effect. */
  revealAt: number | null;
  onMove: (x: number, y: number, z: number, rotationY: number) => void;
}

// ---- input ----
function usePressedKeys() {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  return keys;
}

function Tiles({
  arena,
  correctAnswer,
}: {
  arena: ArenaConfig;
  correctAnswer: number | null;
}) {
  // Tiles with their server-assigned zone (color). Row-major index = row*cols+col.
  const tiles = useMemo(() => {
    const out: {
      col: number;
      row: number;
      x: number;
      z: number;
      zone: number;
    }[] = [];
    for (let row = 0; row < arena.rows; row++) {
      for (let col = 0; col < arena.cols; col++) {
        const { x, z } = tileCenter(col, row, arena);
        const zone = arena.tileZones[row * arena.cols + col] ?? 0;
        out.push({ col, row, x, z, zone });
      }
    }
    return out;
  }, [arena]);

  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  // After the answer is revealed, wrong-colored tiles fall AND fade out.
  useFrame((_, delta) => {
    for (const t of tiles) {
      const mesh = meshRefs.current.get(`${t.col}-${t.row}`);
      if (!mesh) continue;
      const wrong = correctAnswer !== null && t.zone !== correctAnswer;
      const targetY = wrong ? -10 : 0;
      mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetY, 4, delta);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, wrong ? 0 : 1, 2.5, delta);
    }
  });

  return (
    <group>
      {tiles.map((t) => {
        const isCorrect = correctAnswer === t.zone;
        const color = ZONE_COLORS[t.zone % ZONE_COLORS.length];
        return (
          <mesh
            key={`${t.col}-${t.row}`}
            ref={(m) => {
              if (m) meshRefs.current.set(`${t.col}-${t.row}`, m);
            }}
            position={[t.x, 0, t.z]}
            receiveShadow
          >
            <boxGeometry
              args={[arena.tileSize * 0.94, 0.5, arena.tileSize * 0.94]}
            />
            <meshStandardMaterial
              color={color}
              emissive={isCorrect ? color : "#000000"}
              emissiveIntensity={isCorrect ? 0.5 : 0}
              transparent
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Name label rendered as an in-scene sprite (canvas texture) rather than a DOM
// overlay — it moves atomically with the capsule, so no per-frame jitter, and
// the 2D canvas renders Korean using system fonts.
function NameTag({ name, isSelf }: { name: string; isSelf: boolean }) {
  const { texture, aspect } = useMemo(() => {
    const dpr = 2;
    const fontPx = 48 * dpr;
    const pad = 14 * dpr;
    const label = name + (isSelf ? " (나)" : "");
    const font = `bold ${fontPx}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = font;
    const textW = ctx.measureText(label).width;
    canvas.width = Math.ceil(textW + pad * 2);
    canvas.height = Math.ceil(fontPx + pad * 2);

    // Re-apply after the resize cleared the context.
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 8 * dpr;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(label, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = isSelf ? "#7dd3fc" : "#ffffff";
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
    return { texture, aspect: canvas.width / canvas.height };
  }, [name, isSelf]);

  useEffect(() => () => texture.dispose(), [texture]);

  const height = 0.7;
  return (
    <sprite position={[0, 2.7, 0]} scale={[height * aspect, height, 1]} renderOrder={999}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}

/** Y a player falls to when eliminated — below the dropped tiles, out of view. */
const FALL_Y = -18;

function RemotePlayer({ player }: { player: PlayerView }) {
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
    const speed =
      prev.current.distanceTo(g.position) / Math.max(delta, 0.001);
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

function LocalPlayer({
  arena,
  player,
  canMove,
  revealAt,
  onMove,
}: {
  arena: ArenaConfig;
  player: PlayerView;
  canMove: boolean;
  revealAt: number | null;
  onMove: SceneProps["onMove"];
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
    }
    const moving = dx !== 0 || dz !== 0;
    if (dx !== 0 || dz !== 0) {
      movedThisRound.current = true; // input taken over — stop following server
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
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

export default function Scene({
  arena,
  players,
  selfId,
  canMove,
  correctAnswer,
  revealAt,
  onMove,
}: SceneProps) {
  const self = players.find((p) => p.id === selfId) ?? null;
  const others = players.filter((p) => p.id !== selfId);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[14, 26, 14]}
        intensity={1.2}
        castShadow
        // Cover the whole board so shadows aren't clipped to the default ±5 frustum.
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0004}
      />
      <color attach="background" args={["#0b1020"]} />
      <fog attach="fog" args={["#0b1020", 40, 90]} />

      <Tiles arena={arena} correctAnswer={correctAnswer} />

      {others.map((p) => (
        <RemotePlayer key={p.id} player={p} />
      ))}
      {self && (
        <LocalPlayer
          arena={arena}
          player={self}
          canMove={canMove}
          revealAt={revealAt}
          onMove={onMove}
        />
      )}
    </>
  );
}
