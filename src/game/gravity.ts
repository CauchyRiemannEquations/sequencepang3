import type { Board, RNG } from "./types";
import { newTile } from "./board";
// Locked seeds stay anchored. Tiles fall independently within each unlocked column segment.
export function gravityRefill(
  board: Board,
  removed: number[],
  rng: RNG = Math.random,
): Board {
  const gone = new Set(removed);
  const result = board.map((t) => ({ ...t, fall: 0 }));
  for (let col = 0; col < 6; col++) {
    let from = 0;
    for (let boundary = 0; boundary <= 6; boundary++) {
      if (boundary < 6 && !board[boundary * 6 + col].locked) continue;
      const slots = Array.from(
        { length: boundary - from },
        (_, j) => (from + j) * 6 + col,
      );
      const kept = slots.filter((i) => !gone.has(i));
      const missing = slots.length - kept.length;
      slots.forEach((destination, j) => {
        result[destination] =
          j < missing
            ? { ...newTile(rng), fall: missing }
            : {
                ...board[kept[j - missing]],
                fall: (destination - kept[j - missing]) / 6,
              };
      });
      from = boundary + 1;
    }
  }
  return result;
}
