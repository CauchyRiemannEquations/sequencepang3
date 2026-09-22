import type { Ability, AbilityId, RNG, Sequence } from "./types";
export type Definition = {
  id: AbilityId;
  category: "Pattern" | "Effect" | "Utility";
  description: string;
  detail: string;
  maxLevel: number;
  rare?: boolean;
  bonuses?: number[];
  condition?: (s: Sequence) => boolean;
};
export const ABILITIES: Record<AbilityId, Definition> = {
  EVEN: {
    id: "EVEN",
    category: "Pattern",
    description: "짝수 수열 · 데미지 +40%",
    detail: "모든 숫자가 짝수일 때",
    maxLevel: 3,
    bonuses: [0.4, 0.7, 0.9],
    condition: (s) => s.values.every((n) => n % 2 === 0),
  },
  ODD: {
    id: "ODD",
    category: "Pattern",
    description: "홀수 수열 · 데미지 +40%",
    detail: "모든 숫자가 홀수일 때",
    maxLevel: 3,
    bonuses: [0.4, 0.7, 0.9],
    condition: (s) => s.values.every((n) => n % 2 === 1),
  },
  D1: {
    id: "D1",
    category: "Pattern",
    description: "간격 ±1 · 데미지 +50%",
    detail: "숫자의 간격이 +1 또는 −1일 때",
    maxLevel: 3,
    rare: true,
    bonuses: [0.5, 0.9, 1.2],
    condition: (s) => Math.abs(s.difference) === 1,
  },
  D2: {
    id: "D2",
    category: "Pattern",
    description: "간격 ±2 · 데미지 +50%",
    detail: "숫자의 간격이 +2 또는 −2일 때",
    maxLevel: 3,
    bonuses: [0.5, 0.9, 1.2],
    condition: (s) => Math.abs(s.difference) === 2,
  },
  SHORT: {
    id: "SHORT",
    category: "Pattern",
    description: "정확히 3개 · 데미지 +50%",
    detail: "정확히 3개의 숫자를 연결할 때",
    maxLevel: 3,
    bonuses: [0.5, 0.9, 1.2],
    condition: (s) => s.length === 3,
  },
  FOUR: {
    id: "FOUR",
    category: "Pattern",
    description: "정확히 4개 · 데미지 +60%",
    detail: "정확히 4개의 숫자를 연결할 때",
    maxLevel: 3,
    rare: true,
    bonuses: [0.6, 1, 1.3],
    condition: (s) => s.length === 4,
  },
  LONG: {
    id: "LONG",
    category: "Pattern",
    description: "5개 이상 · 데미지 ×1.75",
    detail: "5개 이상의 숫자를 연결할 때",
    maxLevel: 3,
    rare: true,
    bonuses: [0.75, 1.2, 1.5],
    condition: (s) => s.length >= 5,
  },
  ECHO: {
    id: "ECHO",
    category: "Effect",
    description: "같은 간격 연속 · 최대 +90%",
    detail: "같은 공차를 반복하면 +30% / +60% / +90%",
    maxLevel: 1,
    rare: true,
  },
  BURST: {
    id: "BURST",
    category: "Effect",
    description: "4개 이상 · 주변 타일 추가 팡",
    detail: "마지막 숫자 주변 일반 타일 1개를 추가 제거",
    maxLevel: 1,
  },
  SWAP: {
    id: "SWAP",
    category: "Utility",
    description: "전투당 1회 · 두 타일 교환",
    detail: "잠기지 않은 타일 두 개 교환 · 턴 소모 없음",
    maxLevel: 1,
  },
  REROLL: {
    id: "REROLL",
    category: "Utility",
    description: "전투당 1회 · 보드 새로고침",
    detail: "새 숫자로 교체 · 잠금과 균열 유지 · 턴 소모 없음",
    maxLevel: 1,
  },
};
export const ABILITY_IDS = Object.keys(ABILITIES) as AbilityId[];
export const isPattern = (id: AbilityId) =>
  ABILITIES[id].category === "Pattern";
export const matches = (id: AbilityId, s: Sequence) =>
  ABILITIES[id].condition?.(s) ?? false;
export const bonus = (ability: Ability) =>
  ABILITIES[ability.id].bonuses?.[ability.level - 1] ?? 0;
export function acquire(abilities: Ability[], id: AbilityId): Ability[] {
  const owned = abilities.find((a) => a.id === id);
  return owned
    ? abilities.map((a) =>
        a.id === id
          ? { ...a, level: Math.min(ABILITIES[id].maxLevel, a.level + 1) }
          : a,
      )
    : [...abilities, { id, level: 1, ripe: 0, lingering: false }];
}
export function draft(
  abilities: Ability[],
  rare = false,
  rng: RNG = Math.random,
): AbilityId[] {
  const pool = ABILITY_IDS.filter(
    (id) =>
      (!rare || ABILITIES[id].rare) &&
      (abilities.find((a) => a.id === id)?.level ?? 0) < ABILITIES[id].maxLevel,
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
export function pruneDraft(
  abilities: Ability[],
  removed: AbilityId,
  rng: RNG = Math.random,
): AbilityId[] {
  const pool = ABILITY_IDS.filter(
    (id) =>
      id !== removed &&
      !ABILITIES[id].rare &&
      !abilities.some((a) => a.id === id),
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 2);
}
