import type { Board, Crack } from "./types";
import { candidates } from "./sequence";
export function adjacent(a: number, b: number): boolean {
  return (
    a !== b &&
    Math.abs((a % 6) - (b % 6)) <= 1 &&
    Math.abs(Math.floor(a / 6) - Math.floor(b / 6)) <= 1
  );
}
export function crossesCrack(a: number, b: number, crack?: Crack): boolean {
  if (!crack) return false;
  const component = (i: number) =>
    crack.axis === "vertical" ? i % 6 : Math.floor(i / 6);
  return component(a) < crack.position !== component(b) < crack.position;
}
export function extendPath(
  board: Board,
  path: number[],
  next: number,
  crack?: Crack,
): number[] {
  if (!board[next] || board[next].locked || next === path.at(-1)) return path;
  if (path.length > 1 && next === path.at(-2)) return path.slice(0, -1);
  if (path.includes(next)) return path;
  if (
    path.length &&
    (!adjacent(path[path.length - 1], next) ||
      crossesCrack(path[path.length - 1], next, crack))
  )
    return path;
  const proposed = [...path, next];
  return candidates(board, proposed).length ? proposed : path;
}
export function legalPath(
  board: Board,
  path: number[],
  crack?: Crack,
): boolean {
  return (
    path.length >= 3 &&
    path.every(
      (i, n) =>
        !n ||
        (adjacent(path[n - 1], i) && !crossesCrack(path[n - 1], i, crack)),
    ) &&
    candidates(board, path).length > 0
  );
}
export function findMove(board: Board, crack?: Crack): number[] | undefined {
  const visit = (path: number[]): number[] | undefined => {
    if (path.length === 3) return path;
    for (let i = 0; i < 36; i++) {
      const next = extendPath(board, path, i, crack);
      if (next.length === path.length + 1) {
        const found = visit(next);
        if (found) return found;
      }
    }
  };
  for (let i = 0; i < 36; i++)
    if (!board[i].locked) {
      const found = visit([i]);
      if (found) return found;
    }
}
