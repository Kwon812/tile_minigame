"use client";

import { useEffect, useRef, useState } from "react";

/** Shared analog input vector. x = strafe (right +), z = forward (up = -1),
 *  matching the keyboard mapping in Arena's LocalPlayer. Magnitude 0..1. */
export interface MoveVec {
  x: number;
  z: number;
}

const BASE = 128; // outer ring diameter (px)
const KNOB = 56; // thumb knob diameter (px)
const RADIUS = (BASE - KNOB) / 2; // max knob travel from center

/**
 * Touch joystick overlay. Renders only on coarse-pointer (touch) devices.
 * Writes a normalized {x,z} vector into `moveVec` while dragged; zeroes it on
 * release. The 3D LocalPlayer reads the same ref each frame, so it adds to the
 * keyboard input without any extra wiring.
 */
export default function Joystick({
  moveVec,
  visible,
}: {
  moveVec: React.MutableRefObject<MoveVec>;
  visible: boolean;
}) {
  const [isTouch, setIsTouch] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);
  const baseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouch(
      window.matchMedia?.("(pointer: coarse)").matches ||
        "ontouchstart" in window
    );
  }, []);

  // Zero the shared vector + reset the knob whenever the joystick hides.
  useEffect(() => {
    if (!visible) {
      moveVec.current.x = 0;
      moveVec.current.z = 0;
      setKnob({ x: 0, y: 0 });
      pointerId.current = null;
    }
  }, [visible, moveVec]);

  if (!isTouch || !visible) return null;

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
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerId.current = e.pointerId;
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
      className="pointer-events-auto absolute bottom-8 left-8 z-30 touch-none select-none rounded-full border border-white/20 bg-white/10 backdrop-blur"
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
