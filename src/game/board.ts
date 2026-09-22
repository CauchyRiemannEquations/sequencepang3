import type { Board, Crack, RNG, Tile } from "./types";
import { findMove } from "./path";
let nextId = 0;
export function newTile(rng: RNG = Math.random): Tile {
  return { id: ++nextId, value: 1 + Math.floor(rng() * 9) };
}
export function generateBoard(
  rng: RNG = Math.random,
  wild = false,
  crack?: Crack,
): Board {
  const board = Array.from({ length: 36 }, () => newTile(rng));
  if (wild) board[Math.floor(rng() * 36)].wild = true;
  return ensurePlayable(board, crack, rng).board;
}
export function ensurePlayable(
  board: Board,
  crack?: Crack,
  rng: RNG = Math.random,
): { board: Board; rescued: boolean } {
  if (findMove(board, crack)) return { board, rescued: false };
  let candidate = board.map((t) => ({ ...t }));
  for (let tryIndex = 0; tryIndex < 30; tryIndex++) {
    candidate = candidate.map((t) =>
      t.locked ? t : { ...t, value: 1 + Math.floor(rng() * 9) },
    );
    if (findMove(candidate, crack)) return { board: candidate, rescued: true };
  }
  // Extremely obstructed boards get three unlocked tiles inside one side of the crack.
  const start =
    crack?.axis === "vertical" && crack.position < 3 ? crack.position : 0;
  for (let j = 0; j < 3; j++)
    candidate[start + j] = {
      ...candidate[start + j],
      value: 2 + j * 2,
      locked: false,
    };
  return { board: candidate, rescued: true };
}
