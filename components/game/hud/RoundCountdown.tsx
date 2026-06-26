"use client";

import type { QuestionStartPayload } from "@/lib/types";

/** Pre-round 3·2·1·GO overlay. Renders nothing when `count` is null. */
export function RoundCountdown({
  count,
  question,
}: {
  count: number | null;
  question: QuestionStartPayload | null;
}) {
  if (count === null) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div key={count} className="go-pop text-center">
        {question && (
          <div className="mb-1 text-2xl font-bold text-sky-300">
            라운드 {question.round} / {question.totalRounds}
          </div>
        )}
        {count > 0 ? (
          <>
            <div className="text-[10rem] font-extrabold leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              {count}
            </div>
            <div className="mt-2 text-xl font-bold text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              색과 구멍 위치를 외우세요!
            </div>
          </>
        ) : (
          <div className="text-8xl font-extrabold text-sky-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            GO!
          </div>
        )}
      </div>
    </div>
  );
}
