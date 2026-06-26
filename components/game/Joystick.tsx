"use client";

import { useEffect, useRef, useState } from "react";

/** Shared analog input vector. x = strafe (right +), z = forward (up = -1),
 *  matching the keyboard mapping in Arena's LocalPlayer. Magnitude 0..1. */
export interface MoveVec {
  x: number;
  z: number;
}

const BASE = 132; // outer ring diameter (px)
const KNOB = 58; // thumb knob diameter (px)
const RADIUS = (BASE - KNOB) / 2; // max knob travel from center

/**
 * Touch joystick overlay. Renders only on coarse-pointer (touch) devices.
 *
 * It stays MOUNTED for the whole game (the parent keeps it alive) and only dims
 * when `active` is false. This is deliberate: between rounds (countdown/reveal)
 * the player can move is false, but if we unmounted the stick a thumb already
 * resting on it would lose its `pointerdown`, so movement wouldn't start until
 * the player lifted and tapped again. Keeping it mounted means a held finger
 * keeps control and re-touch always registers.
 *
 * Writing to `moveVec` while inactive is harmless — LocalPlayer only reads it
 * when the player may actually move.
 */
export default function Joystick({
  moveVec,
  active,
}: {
  moveVec: React.MutableRefObject<MoveVec>;
  active: boolean;
}) {
  const [isTouch, setIsTouch] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);
  const baseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Touch devices (phones + tablets): the primary pointer is coarse. Desktops
    // with a mouse report a fine primary pointer, so they're excluded.
    setIsTouch(window.matchMedia?.("(pointer: coarse)").matches ?? false);
  }, []);

  // When movement turns off AND no finger is on the stick, clear any leftover
  // push. A held finger is left alone so it stays in control into the next round.
  useEffect(() => {
    if (!active && pointerId.current === null) {
      moveVec.current.x = 0;
      moveVec.current.z = 0;
      setKnob({ x: 0, y: 0 });
    }
  }, [active, moveVec]);

  if (!isTouch) return null;

  const updateFrom = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    // Normalize to 0..1 of the travel radius. Screen-up (negative dy) is forward.
    moveVec.current.x = dx / RADIUS;
    moveVec.current.z = dy / RADIUS;
  };

  const reset = () => {
    moveVec.current.x = 0;
    moveVec.current.z = 0;
    setKnob({ x: 0, y: 0 });
    pointerId.current = null;
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        // Capture so we keep getting moves even if the thumb slides off the pad.
        e.preventDefault();
        pointerId.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* capture unsupported — pointer events still bubble to us */
        }
        updateFrom(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerId.current !== e.pointerId) return;
        updateFrom(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (pointerId.current === e.pointerId) reset();
      }}
      onPointerCancel={(e) => {
        if (pointerId.current === e.pointerId) reset();
      }}
      onLostPointerCapture={() => {
        // Browser yanked the capture (e.g. gesture interception) — recenter so
        // we don't leave a stuck push.
        if (pointerId.current !== null) reset();
      }}
      className={`pointer-events-auto absolute bottom-28 left-8 z-30 touch-none select-none rounded-full border border-white/20 bg-white/10 backdrop-blur transition-opacity ${
        active ? "opacity-100" : "opacity-40"
      }`}
      style={{ width: BASE, height: BASE }}
    >
      <div
        className="absolute rounded-full bg-white/70 shadow-lg"
        style={{
          width: KNOB,
          height: KNOB,
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
        }}
      />
    </div>
  );
}
