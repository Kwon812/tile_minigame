"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import Scene from "./Arena";
import Joystick, { type MoveVec } from "./Joystick";
import { Hud } from "./hud/Hud";
import { RoundCountdown } from "./hud/RoundCountdown";
import { RevealBanner } from "./hud/RevealBanner";
import { WaitingRoom } from "./hud/WaitingRoom";
import { GameOverOverlay } from "./hud/GameOverOverlay";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useCountdown } from "@/hooks/useCountdown";
import { useRoundStart } from "@/hooks/useRoundStart";
import { sfx, setMuted } from "@/lib/sound";

export default function GameClient({
  roomId,
  nickname,
  color,
  spectator = false,
}: {
  roomId: string;
  nickname: string;
  color: number;
  spectator?: boolean;
}) {
  const game = useGameSocket(roomId, nickname, color, spectator);
  const {
    status,
    error,
    serverOffset,
    selfId,
    room,
    players,
    question,
    reveal,
    gameEnd,
    startGame,
    sendMove,
  } = game;

  // Shared analog input vector written by the touch joystick, read by the 3D
  // LocalPlayer each frame.
  const moveVec = useRef<MoveVec>({ x: 0, z: 0 });

  const remaining = useCountdown(question?.endsAt, serverOffset);
  const count = useRoundStart(question?.startsAt, serverOffset);
  const inCountdown = count !== null && count > 0;

  const self = players.find((p) => p.id === selfId) ?? null;
  const aliveCount = players.filter((p) => p.alive).length;

  // Derive the phase from events we actually receive. The server only pushes
  // `roomState` on join/disconnect/end, so `room.gameState` stays "waiting"
  // through gameplay — we must not key the UI off it.
  const phase: "waiting" | "question" | "reveal" | "ended" = gameEnd
    ? "ended"
    : reveal
    ? "reveal"
    : question
    ? "question"
    : "waiting";
  const canMove =
    phase === "question" &&
    reveal === null &&
    !!self?.alive &&
    !gameEnd &&
    !inCountdown;

  // Board phase: study (countdown — colors shown), act (moving — gray), reveal.
  // In "normal" difficulty the tiles never gray out, so the moving phase keeps
  // showing real colors (rendered the same as "study").
  const tileMode: "study" | "act" | "reveal" = reveal
    ? "reveal"
    : phase === "question" && !inCountdown
    ? room?.difficulty === "normal"
      ? "study"
      : "act"
    : "study";

  const options = useMemo(() => question?.question.options ?? [], [question]);

  // Render with the CURRENT round's board (reshuffled each round and sent via
  // questionStart). room.arena is only the initial/waiting layout — using it
  // would desync the tiles you see from the tiles the server judges.
  const arena = question?.arena ?? room?.arena ?? null;

  // ---- game juice: sound + flashes ----
  const [muted, setMutedState] = useState(false);
  const [revealAt, setRevealAt] = useState<number | null>(null);

  // Answer reveal: trigger camera impact + chime (+ whoosh if anyone dropped).
  useEffect(() => {
    if (reveal) {
      setRevealAt(Date.now());
      sfx.reveal();
      if (reveal.eliminatedPlayerIds.length > 0) sfx.eliminate();
    } else {
      setRevealAt(null);
    }
  }, [reveal]);

  // 3·2·1 countdown beeps, then "GO".
  useEffect(() => {
    if (count === null) return;
    if (count > 0) sfx.tick();
    else sfx.go();
  }, [count]);

  // Falling whoosh the moment I drop into a hole mid-round.
  const prevAlive = useRef(true);
  useEffect(() => {
    const aliveNow = !!self?.alive;
    if (prevAlive.current && !aliveNow && phase === "question") sfx.eliminate();
    prevAlive.current = aliveNow;
  }, [self?.alive, phase]);

  // Game over: fanfare or losing tone.
  useEffect(() => {
    if (!gameEnd) return;
    if (gameEnd.winners.length > 0) sfx.win();
    else sfx.lose();
  }, [gameEnd]);

  // Countdown ticks for the final seconds.
  useEffect(() => {
    if (phase === "question" && remaining > 0 && remaining <= 5) sfx.tick();
  }, [remaining, phase]);

  // Suppress browser touch gestures (scroll, pull-to-refresh, pinch-zoom,
  // double-tap zoom) for the duration of the game so they don't fight with the
  // joystick / camera. `touch-action: none` on the root handles most of it;
  // these listeners cover iOS Safari, which ignores overscroll-behavior.
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    document.addEventListener("gesturestart", prevent);
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.removeEventListener("touchmove", prevent);
      document.removeEventListener("gesturestart", prevent);
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  const lowTime = phase === "question" && remaining > 0 && remaining <= 5;
  const eliminatedThisRound = reveal?.eliminatedPlayerIds.length ?? 0;

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
    sfx.unlock();
  };

  const handleStart = () => {
    sfx.unlock();
    startGame();
  };

  if (status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <p className="text-xl font-semibold text-red-400">{error}</p>
        <Link href="/" className="rounded-lg bg-sky-600 px-4 py-2">
          홈으로
        </Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <p className="animate-pulse text-lg">접속 중…</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen touch-none overflow-hidden overscroll-none bg-slate-950">
      <Canvas shadows camera={{ position: [0, 20, 20], fov: 50 }}>
        <Scene
          arena={arena ?? room.arena}
          players={players}
          selfId={selfId}
          canMove={canMove}
          correctAnswer={reveal ? reveal.correctAnswer : null}
          tileMode={tileMode}
          revealAt={revealAt}
          spectator={spectator}
          moveVec={moveVec}
          onMove={sendMove}
        />
      </Canvas>

      {/* Touch joystick — kept mounted through the whole game (not just while
          canMove) so a thumb resting on it during the countdown still controls
          movement the instant it's allowed. Dims when movement is off. */}
      {!spectator && !gameEnd && !!self?.alive && (
        <Joystick moveVec={moveVec} active={canMove} />
      )}

      <Hud
        room={room}
        spectator={spectator}
        muted={muted}
        onToggleMute={toggleMute}
        phase={phase}
        question={question}
        inCountdown={inCountdown}
        remaining={remaining}
        lowTime={lowTime}
        options={options}
        correctAnswer={reveal ? reveal.correctAnswer : null}
        revealed={reveal !== null}
        canMove={canMove}
        selfAlive={!!self?.alive}
        gameOver={!!gameEnd}
        aliveCount={aliveCount}
        playersCount={players.length}
      />

      {/* Round-start 3·2·1·GO countdown */}
      {phase !== "ended" && (
        <RoundCountdown count={count} question={question} />
      )}

      {/* Answer reveal banner */}
      {phase === "reveal" && (
        <RevealBanner eliminatedThisRound={eliminatedThisRound} />
      )}

      {/* Waiting room overlay */}
      {phase === "waiting" && !gameEnd && (
        <WaitingRoom
          room={room}
          players={players}
          selfId={selfId}
          spectator={spectator}
          onStart={handleStart}
        />
      )}

      {/* Game over overlay */}
      {gameEnd && <GameOverOverlay gameEnd={gameEnd} selfId={selfId} />}
    </div>
  );
}
