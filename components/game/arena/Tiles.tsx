"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ArenaConfig } from "@/lib/types";
import { ZONE_COLORS, HOLE_ZONE, tileCenter } from "@/lib/gameConfig";
import { TILE_GRAY, TILE_HOLE_DARK, type TileMode } from "./shared";

export function Tiles({
  arena,
  correctAnswer,
  tileMode,
}: {
  arena: ArenaConfig;
  correctAnswer: number | null;
  tileMode: TileMode;
}) {
  // Every grid cell (including holes) is a mesh — holes only differ by color/drop.
  const tiles = useMemo(() => {
    const out: {
      col: number;
      row: number;
      x: number;
      z: number;
      zone: number;
      isHole: boolean;
    }[] = [];
    for (let row = 0; row < arena.rows; row++) {
      for (let col = 0; col < arena.cols; col++) {
        const zone = arena.tileZones[row * arena.cols + col] ?? 0;
        const { x, z } = tileCenter(col, row, arena);
        out.push({ col, row, x, z, zone, isHole: zone === HOLE_ZONE });
      }
    }
    return out;
  }, [arena]);

  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  // A tile stays up unless we're revealing and it's wrong-colored or a hole.
  const stays = (t: { zone: number; isHole: boolean }) =>
    tileMode !== "reveal" || (!t.isHole && t.zone === correctAnswer);

  useFrame((_, delta) => {
    for (const t of tiles) {
      const mesh = meshRefs.current.get(`${t.col}-${t.row}`);
      if (!mesh) continue;
      const up = stays(t);
      mesh.position.y = THREE.MathUtils.damp(
        mesh.position.y,
        up ? 0 : -10,
        4,
        delta
      );
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, up ? 1 : 0, 2.5, delta);
    }
  });

  function tileColor(t: { zone: number; isHole: boolean }) {
    if (tileMode === "act") return TILE_GRAY; // everything gray, holes hidden
    if (t.isHole) return tileMode === "study" ? TILE_HOLE_DARK : TILE_GRAY;
    return ZONE_COLORS[t.zone % ZONE_COLORS.length];
  }

  return (
    <group>
      {tiles.map((t) => {
        const isCorrect = tileMode === "reveal" && t.zone === correctAnswer;
        const color = tileColor(t);
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
