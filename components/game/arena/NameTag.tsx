"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

// Name label rendered as an in-scene sprite (canvas texture) rather than a DOM
// overlay — it moves atomically with the capsule, so no per-frame jitter, and
// the 2D canvas renders Korean using system fonts.
export function NameTag({ name, isSelf }: { name: string; isSelf: boolean }) {
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
    <sprite
      position={[0, 2.7, 0]}
      scale={[height * aspect, height, 1]}
      renderOrder={999}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}
