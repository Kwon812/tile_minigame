import GameEntry from "./GameEntry";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ nick?: string; color?: string }>;
}) {
  const { roomId } = await params;
  const { nick, color } = await searchParams;
  const colorIndex = Number.isNaN(Number(color)) ? 0 : Number(color);
  return (
    <GameEntry
      roomId={roomId}
      initialNick={nick ?? ""}
      initialColor={colorIndex}
    />
  );
}
