import { describe, expect, it } from "vitest";
import { ABILITIES, acquire, draft, pruneDraft } from "./abilities";
import { baseDamage, bestSequence, calculateDamage } from "./damage";
import { advanceRipe } from "./ripe";
import { attack, createBattle, rerollBoard, swapTiles } from "./battle";
import { ENEMIES, enemyBehavior } from "./enemies";
import { generateBoard, ensurePlayable } from "./board";
import { findMove, legalPath } from "./path";
import {
  chooseMutation,
  chooseReward,
  fillRipe,
  jumpBoss,
  newRun,
  playAttack,
  rest,
  victory,
} from "./run";
import type { Ability, AbilityId, Board, EnemyId, Sequence } from "./types";
const abilities = (...ids: AbilityId[]): Ability[] =>
  ids.map((id) => ({ id, level: 1, ripe: 0, lingering: false }));
const seq = (...values: number[]): Sequence => ({
  values,
  length: values.length,
  difference: values[1] - values[0],
});
const patternBoard = (): Board => {
  const b = generateBoard();
  [2, 4, 6, 8].forEach(
    (value, i) => (b[i] = { ...b[i], value, wild: false, locked: false }),
  );
  return b;
};
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
describe("Damage and build combinations", () => {
  it("uses the specified non-linear length table", () =>
    expect([2, 3, 4, 5, 6, 7, 9].map(baseDamage)).toEqual([
      0, 30, 50, 80, 120, 170, 170,
    ]));
  it("reproduces BASE 50, EVEN +20, D2 +35 = 105 regardless of acquisition order", () => {
    const a = calculateDamage(seq(2, 4, 6, 8), abilities("D2", "EVEN"));
    expect(a.total).toBe(105);
    expect(a.lines.map((l) => l.amount)).toEqual([20, 35]);
  });
  it("uses all Pattern conditions including negative difference and exact lengths", () => {
    const a = abilities("ODD", "D1", "SHORT", "FOUR", "LONG", "D2", "EVEN");
    expect(calculateDamage(seq(9, 7, 5), a).matched).toEqual([
      "ODD",
      "D2",
      "SHORT",
    ]);
    expect(calculateDamage(seq(7, 6, 5, 4, 3), a).matched).toEqual([
      "D1",
      "LONG",
    ]);
  });
  it("caps Pattern levels at III and excludes capped choices", () => {
    let a = abilities("D2");
    for (let i = 0; i < 4; i++) a = acquire(a, "D2");
    expect(a[0].level).toBe(3);
    expect(calculateDamage(seq(2, 4, 6), a).total).toBe(66);
    expect(draft(a, false, () => 0.999)).not.toContain("D2");
  });
  it("stacks Echo by signed difference and resets on change", () => {
    const a = abilities("ECHO");
    expect(calculateDamage(seq(2, 4, 6), a, undefined, 2, 0).total).toBe(39);
    expect(calculateDamage(seq(2, 4, 6), a, undefined, 2, 1).total).toBe(48);
    expect(calculateDamage(seq(2, 4, 6), a, undefined, 2, 9).total).toBe(57);
    expect(calculateDamage(seq(6, 4, 2), a, undefined, 2, 2).echo).toBe(0);
  });
  it("applies DOUBLE CORE after all matching Pattern bonuses", () => {
    expect(
      calculateDamage(seq(2, 4, 6, 8), abilities("EVEN", "D2"), "DOUBLE CORE")
        .total,
    ).toBe(137);
    expect(
      calculateDamage(seq(2, 4, 6), abilities("EVEN"), "DOUBLE CORE").total,
    ).toBe(42);
  });
  it("Wild selects the maximum-damage arithmetic interpretation", () => {
    const b = patternBoard();
    [0, 1, 2].forEach((i) => (b[i].wild = true));
    const best = bestSequence(b, [0, 1, 2], abilities("EVEN", "D2"));
    expect(best?.damage.matched).toEqual(["EVEN", "D2"]);
    expect(Math.abs(best!.sequence.difference)).toBe(2);
  });
});
describe("RIPE timing", () => {
  it("charges every matched pattern simultaneously and triggers only on the fourth match", () => {
    let a = abilities("EVEN", "D2", "FOUR");
    const s = seq(2, 4, 6, 8);
    for (let i = 1; i <= 3; i++) {
      const d = calculateDamage(s, a);
      expect(d.ripeIds).toEqual([]);
      const next = advanceRipe(a, d);
      a = next.abilities;
      expect(a.map((x) => x.ripe)).toEqual([i, i, i]);
      expect(next.ready.length).toBe(i === 3 ? 3 : 0);
    }
    const d = calculateDamage(s, a);
    expect(d.ripeIds).toEqual(["EVEN", "D2", "FOUR"]);
    expect(d.total).toBe(396);
    expect(advanceRipe(a, d).abilities.map((x) => x.ripe)).toEqual([0, 0, 0]);
  });
  it("nonmatching conditions neither consume nor charge RIPE", () => {
    const a = abilities("EVEN");
    a[0].ripe = 3;
    const next = advanceRipe(a, calculateDamage(seq(1, 3, 5), a));
    expect(next.abilities[0].ripe).toBe(3);
  });
  it("JUICY lasts exactly the next attack; it does not recursively retrigger", () => {
    let a = abilities("EVEN");
    a[0].ripe = 3;
    const s = seq(2, 4, 6);
    a = advanceRipe(a, calculateDamage(s, a), "JUICY").abilities;
    expect(a[0]).toMatchObject({ ripe: 0, lingering: true });
    const repeated = calculateDamage(s, a);
    expect(repeated.total).toBe(54);
    expect(repeated.ripeIds).toEqual([]);
    a = advanceRipe(a, repeated, "JUICY").abilities;
    expect(a[0]).toMatchObject({ ripe: 1, lingering: false });
    expect(calculateDamage(s, a).total).toBe(42);
  });
  it("JUICY expires even when the next attack does not match", () => {
    const a = abilities("EVEN");
    a[0].lingering = true;
    expect(
      advanceRipe(a, calculateDamage(seq(1, 3, 5), a), "JUICY").abilities[0]
        .lingering,
    ).toBe(false);
  });
  it("LONG doubles only its bonus: ×1.75 becomes ×2.5", () => {
    const a = abilities("LONG");
    a[0].ripe = 3;
    expect(calculateDamage(seq(1, 2, 3, 4, 5), a).total).toBe(200);
  });
});
describe("Battles, enemies, and utilities", () => {
  it("invalid selections spend no turns and mutate no board", () => {
    const b = createBattle("SEED");
    b.board = patternBoard();
    const copy = structuredClone(b);
    expect(attack(b, [], [0, 1])).toBeUndefined();
    expect(attack(b, [], [0, 1, 1])).toBeUndefined();
    expect(b).toEqual(copy);
  });
  it("wins on the last allowed turn before loss evaluation", () => {
    const b = createBattle("SEED");
    b.board = patternBoard();
    b.hp = 30;
    b.turn = 6;
    const result = attack(b, [], [0, 1, 2])!;
    expect(result.won).toBe(true);
    expect(result.lost).toBe(false);
    expect(result.battle.turn).toBe(7);
    b.hp = 31;
    expect(attack(b, [], [0, 1, 2])!.lost).toBe(true);
  });
  it("BURST removes one additional normal neighbor without extra damage", () => {
    const b = createBattle("SEED");
    b.board = patternBoard();
    const r = attack(b, abilities("BURST"), [0, 1, 2, 3])!;
    expect(r.removed).toHaveLength(5);
    expect(r.damage.total).toBe(50);
    expect(r.battle.board).toHaveLength(36);
  });
  it("locks every second turn and spreads from an existing elite lock", () => {
    const b = createBattle("LOCK");
    b.turn = 1;
    expect(enemyBehavior(b).board.some((t) => t.locked)).toBe(false);
    b.turn = 2;
    expect(enemyBehavior(b).board.filter((t) => t.locked)).toHaveLength(1);
    const elite = createBattle("BLACK SEED");
    elite.turn = 2;
    elite.board[0].locked = true;
    expect(
      enemyBehavior(elite, () => 0).board.filter((t) => t.locked),
    ).toHaveLength(3);
  });
  it("MUTANT changes two distinct normal tiles within 1–9", () => {
    const b = createBattle("MUTANT");
    b.board[0].value = 1;
    b.board[1].value = 9;
    const out = enemyBehavior(b, () => 0);
    expect(
      out.board.filter((t, i) => t.value !== b.board[i].value),
    ).toHaveLength(2);
    expect(out.board[0].value).toBe(2);
    expect(out.board[1].value).toBe(8);
  });
  it("boss cracks move at 3 turns, rotate at HP350, then move every 2 phase turns", () => {
    let b = createBattle("THE SPLITTER");
    const start = b.crack!.position;
    for (let i = 1; i <= 2; i++) {
      b = enemyBehavior({ ...b, turn: i }, () => 0);
      expect(b.crack!.position).toBe(start);
    }
    b = enemyBehavior({ ...b, turn: 3 }, () => 0);
    expect(b.crack!.position).toBe(2);
    b = enemyBehavior({ ...b, hp: 350, turn: 4 });
    expect(b.crack).toEqual({ axis: "horizontal", position: 3 });
    expect(b.phase).toBe(2);
    b = enemyBehavior({ ...b, turn: 5 });
    expect(b.crack!.position).toBe(3);
    b = enemyBehavior({ ...b, turn: 6 }, () => 0);
    expect(b.crack!.position).toBe(2);
  });
  it("boss crossing invalidation preserves abilities and prevents damage", () => {
    const b = createBattle("THE SPLITTER");
    b.board = patternBoard();
    expect(attack(b, abilities("EVEN", "D2"), [1, 2, 3])).toBeUndefined();
    expect(attack(b, abilities("EVEN", "D2"), [0, 1, 2])!.damage.total).toBe(
      63,
    );
  });
  it("SWAP and REROLL spend zero turns, are single-use, and preserve locks", () => {
    const b = createBattle("LOCK");
    b.board = patternBoard();
    b.board[5].locked = true;
    expect(swapTiles(b, 0, 5)).toBe(b);
    const swapped = swapTiles(b, 0, 1);
    expect(swapped.turn).toBe(0);
    expect(swapped.board[0].value).toBe(4);
    expect(swapTiles(swapped, 0, 1)).toBe(swapped);
    const rerolled = rerollBoard(b);
    expect(rerolled.usedReroll).toBe(true);
    expect(rerolled.turn).toBe(0);
    expect(rerolled.board[5].locked).toBe(true);
    expect(rerollBoard(rerolled)).toBe(rerolled);
  });
  it("guarantees a playable rescue even with a pathological RNG and locked board", () => {
    const b = generateBoard().map((t) => ({ ...t, locked: true, value: 9 }));
    for (const crack of [
      { axis: "vertical" as const, position: 2 },
      { axis: "horizontal" as const, position: 3 },
    ]) {
      const result = ensurePlayable(b, crack, () => 0.99);
      const path = findMove(result.board, crack)!;
      expect(result.rescued).toBe(true);
      expect(legalPath(result.board, path, crack)).toBe(true);
    }
  });
});
describe("Seven-stage progression", () => {
  it("progresses through rewards, mutation, elite, rest and final clear", () => {
    let r = newRun();
    r = chooseReward(victory(r), "EVEN");
    expect([r.stage, r.battle.enemy]).toEqual([2, "LOCK"]);
    r = chooseReward(victory(r), "D2");
    expect([r.stage, r.screen]).toEqual([3, "mutation"]);
    r = chooseMutation(r, "WILD");
    expect([r.stage, r.battle.enemy]).toEqual([4, "BLACK SEED"]);
    expect(r.battle.board.filter((t) => t.wild)).toHaveLength(1);
    r = victory(r);
    expect(r.rewards).toHaveLength(3);
    expect(r.rewards.every((id) => ABILITIES[id].rare)).toBe(true);
    r = chooseReward(r, "LONG");
    expect([r.stage, r.battle.enemy]).toEqual([5, "MUTANT"]);
    r = chooseReward(victory(r), "ECHO");
    expect([r.stage, r.screen]).toEqual([6, "rest"]);
    r = rest(r, "JUICE", "EVEN");
    expect(r.stage).toBe(7);
    expect(r.abilities.find((a) => a.id === "EVEN")!.ripe).toBe(2);
    r.battle.hp = 1;
    r.battle.board = patternBoard();
    r = playAttack(r, [0, 1, 2])!.run;
    expect(r.screen).toBe("clear");
    expect(r.stats.highestDamage).toBeGreaterThan(0);
  });
  it("rare draft still has three choices when ECHO is already owned", () =>
    expect(draft(abilities("ECHO"), true)).toHaveLength(3));
  it("PRUNE offers two new normal abilities and atomically replaces the chosen one", () => {
    let r = newRun();
    r.stage = 6;
    r.screen = "rest";
    r.abilities = abilities("EVEN", "D2", "ECHO", "LONG");
    const options = pruneDraft(r.abilities, "EVEN");
    expect(options).toHaveLength(2);
    expect(
      options.every(
        (id) => !ABILITIES[id].rare && !r.abilities.some((a) => a.id === id),
      ),
    ).toBe(true);
    r = rest(r, "PRUNE", "EVEN", options[0]);
    expect(r.abilities.some((a) => a.id === "EVEN")).toBe(false);
    expect(r.abilities.some((a) => a.id === options[0])).toBe(true);
    expect(r.stage).toBe(7);
  });
  it("GROW keeps the gauge, raises the level and enters the boss", () => {
    let r = newRun();
    r.stage = 6;
    r.abilities = abilities("D2");
    r.abilities[0].ripe = 3;
    r = rest(r, "GROW", "D2");
    expect(r.abilities[0]).toMatchObject({ level: 2, ripe: 3 });
    expect(r.stage).toBe(7);
  });
  it("debug boss and RIPE actions stay consistent with battle flow", () => {
    let r = newRun();
    r.abilities = abilities("EVEN", "BURST");
    r = fillRipe(jumpBoss(r));
    expect(r.stage).toBe(7);
    expect(r.abilities.map((a) => a.ripe)).toEqual([3, 0]);
    expect(r.battle.hp).toBe(700);
  });
  it("randomized legal attacks preserve board size, number range and unique identity", () => {
    for (const enemy of Object.keys(ENEMIES) as EnemyId[]) {
      for (let seed = 0; seed < 8; seed++) {
        const rng = seeded(seed);
        let b = createBattle(enemy, "WILD", rng);
        let a = abilities("EVEN", "D2", "BURST");
        for (let turn = 0; turn < 12; turn++) {
          const p = findMove(b.board, b.crack);
          expect(p).toBeDefined();
          const result = attack(b, a, p!, "WILD", rng);
          if (!result) break;
          b = result.battle;
          a = result.abilities;
          expect(b.board).toHaveLength(36);
          expect(new Set(b.board.map((t) => t.id)).size).toBe(36);
          expect(b.board.every((t) => t.value >= 1 && t.value <= 9)).toBe(true);
          if (result.won || result.lost) break;
        }
      }
    }
  });
});
