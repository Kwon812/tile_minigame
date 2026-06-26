"use client";

import type { ArenaConfig, PlayerView } from "@/lib/types";
import type { MoveVec } from "./Joystick";
import { Tiles } from "./arena/Tiles";
import { LocalPlayer } from "./arena/LocalPlayer";
import { RemotePlayer } from "./arena/RemotePlayer";
import { SpectatorCamera } from "./arena/SpectatorCamera";
import type { MoveHandler, TileMode } from "./arena/shared";

export type { TileMode };

export interface SceneProps {
  arena: ArenaConfig;
  players: PlayerView[];
  selfId: string | null;
  /** Player may move (active question phase). */
  canMove: boolean;
  /** Correct zone index once revealed, else null. */
  correctAnswer: number | null;
  /** Board display phase. */
  tileMode: TileMode;
  /** Timestamp (ms) the answer was revealed, for the camera impact effect. */
  revealAt: number | null;
  /** Admin spectator — overview camera, no local player. */
  spectator: boolean;
  /** Touch-joystick analog input, added to keyboard input each frame. */
  moveVec: React.MutableRefObject<MoveVec>;
  onMove: MoveHandler;
}

export default function Scene({
  arena,
  players,
  selfId,
  canMove,
  correctAnswer,
  tileMode,
  revealAt,
  spectator,
  moveVec,
  onMove,
}: SceneProps) {
  const self = spectator ? null : players.find((p) => p.id === selfId) ?? null;
  const others = spectator
    ? players
    : players.filter((p) => p.id !== selfId);

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

      <Tiles arena={arena} correctAnswer={correctAnswer} tileMode={tileMode} />

      {others.map((p) => (
        <RemotePlayer key={p.id} player={p} />
      ))}
      {self && (
        <LocalPlayer
          arena={arena}
          player={self}
          canMove={canMove}
          revealAt={revealAt}
          moveVec={moveVec}
          onMove={onMove}
        />
      )}
      {spectator && <SpectatorCamera />}
    </>
  );
}
