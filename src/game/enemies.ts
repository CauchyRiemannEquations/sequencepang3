import type { Battle, EnemyId, RNG } from "./types";
import { adjacent } from "./path";
export const ENEMIES: Record<
  EnemyId,
  { hp: number; turns: number; description: string; subtitle: string }
> = {
  SEED: {
    hp: 180,
    turns: 7,
    description: "첫 씨앗을 터뜨릴 시간. 수열을 연결해 공격하세요.",
    subtitle: "THE BEGINNING",
  },
  LOCK: {
    hp: 220,
    turns: 8,
    description: "2턴마다 타일 하나를 잠급니다.",
    subtitle: "SEALED GARDEN",
  },
  MUTANT: {
    hp: 240,
    turns: 8,
    description: "매 턴 숫자 두 개가 ±1만큼 바뀝니다.",
    subtitle: "SHIFTING NUMBERS",
  },
  "BLACK SEED": {
    hp: 360,
    turns: 10,
    description: "2턴마다 잠금 · 45% 확률로 주변까지 확산.",
    subtitle: "ELITE ENCOUNTER",
  },
  "THE SPLITTER": {
    hp: 700,
    turns: 12,
    description: "균열을 넘을 수 없습니다. 반대편에서 가능성을 찾으세요.",
    subtitle: "THE FINAL HARVEST",
  },
};
export function enemyBehavior(battle: Battle, rng: RNG = Math.random): Battle {
  let b = { ...battle, board: battle.board.map((t) => ({ ...t })), notice: "" };
  const pick = (indices: number[]) =>
    indices[Math.floor(rng() * indices.length)];
  if ((b.enemy === "LOCK" || b.enemy === "BLACK SEED") && b.turn % 2 === 0) {
    const previousLocks = b.board
      .map((t, i) => (t.locked ? i : -1))
      .filter((i) => i >= 0);
    let available = b.board
      .map((t, i) => (!t.locked ? i : -1))
      .filter((i) => i >= 0);
    if (available.length) {
      const index = pick(available);
      b.board[index].locked = true;
      b.notice = "타일 하나가 잠겼습니다";
    }
    if (b.enemy === "BLACK SEED" && previousLocks.length && rng() < 0.45) {
      available = b.board
        .map((t, i) =>
          !t.locked && previousLocks.some((j) => adjacent(i, j)) ? i : -1,
        )
        .filter((i) => i >= 0);
      if (available.length) {
        b.board[pick(available)].locked = true;
        b.notice = "검은 씨앗이 주변으로 퍼졌습니다";
      }
    }
  }
  if (b.enemy === "MUTANT") {
    const available = b.board
      .map((t, i) => (!t.locked && !t.wild ? i : -1))
      .filter((i) => i >= 0);
    for (let n = 0; n < 2 && available.length; n++) {
      const index = pick(available);
      available.splice(available.indexOf(index), 1);
      const value = b.board[index].value;
      b.board[index].value =
        value === 1 ? 2 : value === 9 ? 8 : value + (rng() < 0.5 ? -1 : 1);
    }
    b.notice = "숫자 두 개가 변했습니다";
  }
  if (b.enemy === "THE SPLITTER") {
    if (b.phase === 1 && b.hp <= 350) {
      b.phase = 2;
      b.phaseTurn = 0;
      b.crack = { axis: "horizontal", position: 3 };
      b.notice = "PHASE II · 균열이 가로로 바뀝니다";
    } else {
      b.phaseTurn++;
      const interval = b.phase === 1 ? 3 : 2;
      if (b.phaseTurn % interval === 0 && b.crack) {
        const p = b.crack.position;
        b.crack = {
          ...b.crack,
          position: p <= 2 ? 3 : p >= 4 ? 3 : p + (rng() < 0.5 ? -1 : 1),
        };
        b.notice = "균열이 이동했습니다";
      }
    }
  }
  return b;
}
