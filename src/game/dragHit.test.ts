import { describe, expect, it } from "vitest";
import { DRAG_HIT_RADIUS, dragHits, type DragTarget, type Point } from "./dragHit";
import { extendPath } from "./path";

const targets: DragTarget[] = Array.from({ length: 36 }, (_, index) => ({
  index,
  x: (index % 6) * 50 + 25,
  y: Math.floor(index / 6) * 50 + 25,
  radius: 44 * DRAG_HIT_RADIUS,
}));
const centre = (index: number): Point => targets[index];

describe("mobile drag hit detection", () => {
  it("sweeps a fast diagonal in order without selecting either side tile", () => {
    expect(dragHits(centre(0), centre(35), targets)).toEqual([
      0, 7, 14, 21, 28, 35,
    ]);
    expect(dragHits(centre(5), centre(30), targets)).toEqual([
      5, 10, 15, 20, 25, 30,
    ]);
    expect(dragHits(centre(35), centre(0), targets)).toEqual([
      35, 28, 21, 14, 7, 0,
    ]);
    expect(dragHits(centre(30), centre(5), targets)).toEqual([
      30, 25, 20, 15, 10, 5,
    ]);
  });

  it("ignores a side-corner graze during an imperfect diagonal", () => {
    // This enters tile 1's rectangular area; it never approaches its centre.
    const corner = { x: 52, y: 47 };
    expect(dragHits(centre(0), corner, targets)).toEqual([0]);
    expect(dragHits(corner, centre(7), targets)).toEqual([7]);
  });

  it("collects skipped horizontal and vertical tiles, including reverse motion", () => {
    expect(dragHits(centre(0), centre(5), targets)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(dragHits(centre(30), centre(0), targets)).toEqual([30, 24, 18, 12, 6, 0]);
  });

  it("handles stationary samples, gaps, and segments outside the board", () => {
    expect(dragHits(centre(7), centre(7), targets)).toEqual([7]);
    expect(dragHits({ x: 50, y: 50 }, { x: 50, y: 50 }, targets)).toEqual([]);
    expect(dragHits({ x: -50, y: -20 }, { x: 350, y: -20 }, targets)).toEqual([]);
    expect(dragHits({ x: -20, y: 25 }, centre(1), targets)).toEqual([0, 1]);
  });

  it("accepts centre hits near the edge of the circular tolerance", () => {
    const y = targets[0].y + targets[0].radius - 0.01;
    expect(dragHits({ x: 0, y }, { x: 100, y }, targets)).toEqual([0, 1]);
    const outsideY = targets[0].y + targets[0].radius + 0.01;
    expect(dragHits({ x: 0, y: outsideY }, { x: 100, y: outsideY }, targets)).toEqual([]);
  });

  it("keeps diagonal selection and fast backtracking consistent with game rules", () => {
    const board = Array.from({ length: 36 }, (_, id) => ({ id, value: 9 }));
    [0, 7, 14, 21].forEach((index, order) => (board[index].value = order + 1));
    let path: number[] = [];
    for (const i of dragHits(centre(0), centre(21), targets))
      path = extendPath(board, path, i);
    expect(path).toEqual([0, 7, 14, 21]);
    for (const i of dragHits(centre(21), centre(7), targets))
      path = extendPath(board, path, i);
    expect(path).toEqual([0, 7]);

    let blocked: number[] = [];
    for (const i of dragHits(centre(0), centre(14), targets))
      blocked = extendPath(board, blocked, i, { axis: "vertical", position: 1 });
    expect(blocked).toEqual([0]);
  });
});
