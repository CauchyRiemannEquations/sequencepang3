import type { Board, Sequence } from "./types";
// Enumerating bounded 1–9 candidates also resolves multiple Wild positions unambiguously.
export function candidates(board: Board, path: number[]): Sequence[] {
  if (
    !path.length ||
    new Set(path).size !== path.length ||
    path.some((i) => !board[i] || board[i].locked)
  )
    return [];
  const result: Sequence[] = [];
  for (let start = 1; start <= 9; start++)
    for (let d = -8; d <= 8; d++) {
      if (d === 0) continue;
      const values = path.map((_, i) => start + d * i);
      if (
        values.every(
          (v, j) =>
            v >= 1 &&
            v <= 9 &&
            (board[path[j]].wild || board[path[j]].value === v),
        )
      )
        result.push({ values, difference: d, length: path.length });
    }
  return result;
}
export function validateSequence(
  board: Board,
  path: number[],
): Sequence | undefined {
  return path.length >= 3 ? candidates(board, path)[0] : undefined;
}
