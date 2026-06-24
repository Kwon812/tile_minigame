// Game-wide constants shared by the client renderer and the authoritative server.
import type { ArenaConfig } from "./types";

/** How long (ms) players have to move onto a tile each round. */
export const ROUND_DURATION_MS = 15_000;

/** Pause (ms) between revealing the answer and starting the next round. */
export const INTERMISSION_MS = 5_000;

/** Position updates per second the client sends (spec: every 100ms). */
export const MOVE_INTERVAL_MS = 100;

/** Player movement speed in world units per second. */
export const PLAYER_SPEED = 6;

/** Color per answer zone (option index). Shared by tiles and the HUD legend. */
export const ZONE_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
  "#a855f7", // purple
  "#ec4899", // pink
];

/** Selectable player/character colors (9 options). */
export const PLAYER_COLORS = [
  "#38bdf8", // sky
  "#f43f5e", // rose
  "#22c55e", // green
  "#eab308", // amber
  "#a855f7", // purple
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#e2e8f0", // white
];

/** Clamp an arbitrary value to a valid player-color index. */
export function clampColorIndex(i: unknown): number {
  const n = typeof i === "number" ? Math.floor(i) : 0;
  return Math.min(PLAYER_COLORS.length - 1, Math.max(0, n));
}

const GRID_COLS = 8;
const GRID_ROWS = 8;
const TILE_SIZE = 3;

/**
 * Build a shuffled tile→zone map: every zone gets a roughly equal number of
 * tiles, scattered across the whole grid (not in columns). Guarantees at least
 * one tile per zone so a correct tile always exists. Row-major order.
 */
export function generateTileZones(
  cols: number,
  rows: number,
  optionCount: number
): number[] {
  const total = cols * rows;
  const zones: number[] = [];
  for (let i = 0; i < total; i++) zones.push(i % optionCount); // balanced counts
  // Fisher–Yates shuffle.
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [zones[i], zones[j]] = [zones[j], zones[i]];
  }
  return zones;
}

/** Build an arena layout for a quiz with `optionCount` answer choices. */
export function makeArena(optionCount: number): ArenaConfig {
  return {
    optionCount,
    cols: GRID_COLS,
    rows: GRID_ROWS,
    tileSize: TILE_SIZE,
    tileZones: generateTileZones(GRID_COLS, GRID_ROWS, optionCount),
  };
}

/** Total world width / depth of the arena. */
export function arenaBounds(arena: ArenaConfig) {
  const width = arena.cols * arena.tileSize;
  const depth = arena.rows * arena.tileSize;
  return {
    width,
    depth,
    minX: -width / 2,
    maxX: width / 2,
    minZ: -depth / 2,
    maxZ: depth / 2,
  };
}

/** Column/row of the tile containing a world position (clamped to the grid). */
export function tileColRow(x: number, z: number, arena: ArenaConfig) {
  const { minX, minZ } = arenaBounds(arena);
  const col = Math.min(
    arena.cols - 1,
    Math.max(0, Math.floor((x - minX) / arena.tileSize))
  );
  const row = Math.min(
    arena.rows - 1,
    Math.max(0, Math.floor((z - minZ) / arena.tileSize))
  );
  return { col, row };
}

/**
 * Which answer zone the tile under a world position belongs to.
 * This is the authoritative survival check (server) and the render mapping.
 */
export function zoneFromPosition(
  x: number,
  z: number,
  arena: ArenaConfig
): number {
  const { col, row } = tileColRow(x, z, arena);
  const index = row * arena.cols + col;
  return arena.tileZones[index] ?? 0;
}

/** World-space center of a tile at column/row index. */
export function tileCenter(col: number, row: number, arena: ArenaConfig) {
  const { minX, minZ } = arenaBounds(arena);
  return {
    x: minX + col * arena.tileSize + arena.tileSize / 2,
    z: minZ + row * arena.tileSize + arena.tileSize / 2,
  };
}
