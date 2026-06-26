"use client";

import { useEffect, useState } from "react";

/**
 * Whole seconds remaining until `endsAt` (a server epoch-ms timestamp).
 * Compares against the server's clock (Date.now() + serverOffset), not this
 * machine's, so the countdown is identical on every client.
 */
export function useCountdown(endsAt: number | undefined, serverOffset: number) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const tick = () =>
      setRemaining(
        Math.max(0, Math.ceil((endsAt - (Date.now() + serverOffset)) / 1000))
      );
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt, serverOffset]);
  return remaining;
}
