import { describe, expect, it } from "vitest";
import { generateBoard } from "./board";
import { extendPath, legalPath, findMove } from "./path";
import { candidates, validateSequence } from "./sequence";
import { gravityRefill } from "./gravity";
const fixture = () =>
  Array.from({ length: 36 }, (_, i) => ({ id: i, value: (i % 9) + 1 }));
describe("Phase 1: board and input", () => {
  it("makes 36 values in range and always offers a legal move", () => {
    for (let n = 0; n < 40; n++) {
      const board = generateBoard();
      expect(board).toHaveLength(36);
      expect(board.every((t) => t.value >= 1 && t.value <= 9)).toBe(true);
      expect(findMove(board)).toBeDefined();
    }
  });
  it("accepts bent diagonal paths, descending numbers, and rejects repeats and zero difference", () => {
    const b = fixture();
    b[0].value = 8;
    b[7].value = 6;
    b[8].value = 4;
    expect(legalPath(b, [0, 7, 8])).toBe(true);
    expect(validateSequence(b, [0, 7, 8])?.difference).toBe(-2);
    expect(extendPath(b, [0, 7], 0)).toEqual([0]);
    expect(extendPath(b, [0, 7, 8], 0)).toEqual([0, 7, 8]);
    b[0].value = 5;
    b[7].value = 5;
    b[8].value = 5;
    expect(validateSequence(b, [0, 7, 8])).toBeUndefined();
  });
  it("rejects invalid additions, non-adjacent jumps and diagonal crack crossings", () => {
    const b = fixture();
    b[0].value = 2;
    b[1].value = 4;
    b[2].value = 9;
    expect(extendPath(b, [0, 1], 2)).toEqual([0, 1]);
    expect(extendPath(b, [0], 12)).toEqual([0]);
    expect(extendPath(b, [0], 7, { axis: "vertical", position: 1 })).toEqual([
      0,
    ]);
  });
  it("refills and preserves surviving tile identity with anchored locks", () => {
    const b = fixture();
    const out = gravityRefill(b, [30]);
    expect(out[30].id).toBe(b[24].id);
    expect(out[6].id).toBe(b[0].id);
    expect(new Set(out.map((t) => t.id)).size).toBe(36);
    const locked = { ...b[12], locked: true };
    b[12] = locked;
    const out2 = gravityRefill(b, [30]);
    expect(out2[12]).toMatchObject(locked);
    expect(out2[6].id).toBe(b[6].id);
  });
  it("resolves wild positions including the first tile", () => {
    const b = fixture().map((t) => ({ ...t, wild: false }));
    b[0].wild = true;
    b[1].value = 4;
    b[2].value = 6;
    expect(candidates(b, [0, 1, 2])[0].values).toEqual([2, 4, 6]);
  });
});
