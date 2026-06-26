// Shared constants, types and helpers for the 3D arena components.
import { PLAYER_COLORS } from "@/lib/gameConfig";

/**
 * Tile board phase:
 * - "study"  : countdown — show real colors; holes marked dark (memorize!).
 * - "act"    : moving — every tile (incl. holes) is uniform gray (from memory).
 * - "reveal" : timer up — real colors return; wrong tiles & holes drop.
 */
export type TileMode = "study" | "act" | "reveal";

export const TILE_GRAY = "#64748b";
export const TILE_HOLE_DARK = "#0b1020";

/** Y a player falls to when eliminated — below the dropped tiles, out of view. */
export const FALL_Y = -18;

/** Authoritative position emitter signature (x, y, z, rotationY). */
export type MoveHandler = (
  x: number,
  y: number,
  z: number,
  rotationY: number
) => void;

export const playerColor = (i: number) =>
  PLAYER_COLORS[
    ((i % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length
  ];
