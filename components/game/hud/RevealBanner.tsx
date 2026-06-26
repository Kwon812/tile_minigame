"use client";

/** "N명 탈락 / 전원 생존" banner shown during the reveal phase. */
export function RevealBanner({ eliminatedThisRound }: { eliminatedThisRound: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className="banner-pop rounded-2xl bg-black/70 px-8 py-4 text-center backdrop-blur">
        {eliminatedThisRound > 0 ? (
          <span className="text-4xl font-extrabold text-red-400">
            💥 {eliminatedThisRound}명 탈락!
          </span>
        ) : (
          <span className="text-4xl font-extrabold text-green-400">
            ✅ 전원 생존!
          </span>
        )}
      </div>
    </div>
  );
}
