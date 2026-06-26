"use client";

import { useEffect, useState } from "react";

/**
 * Pre-round 3·2·1·GO. Returns 3/2/1 while counting, 0 during the GO flash, and
 * null otherwise. Uses the server clock (Date.now() + serverOffset) so the
 * sequence is in sync across clients.
 */
export function useRoundStart(startsAt: number | undefined, serverOffset: number) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!startsAt) {
      setCount(null);
      return;
    }
    const update = () => {
      const ms = startsAt - (Date.now() + serverOffset);
      if (ms > 0) setCount(Math.ceil(ms / 1000));
      else if (ms > -800) setCount(0);
      else setCount(null);
    };
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [startsAt, serverOffset]);
  return count;
}
