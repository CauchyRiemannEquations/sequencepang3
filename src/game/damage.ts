import { ABILITY_IDS, bonus, matches } from "./abilities";
import { candidates } from "./sequence";
import type { Ability, Board, Damage, Mutation, Sequence } from "./types";
export const baseDamage = (length: number) =>
  length < 3
    ? 0
    : length === 3
      ? 30
      : length === 4
        ? 50
        : length === 5
          ? 80
          : length === 6
            ? 120
            : 170;
export function calculateDamage(
  s: Sequence,
  abilities: Ability[],
  mutation?: Mutation,
  lastDifference?: number,
  previousEcho = 0,
): Damage {
  const base = baseDamage(s.length);
  let total = base;
  const matched = ABILITY_IDS.filter(
    (id) => abilities.some((a) => a.id === id) && matches(id, s),
  );
  const lines: Damage["lines"] = [],
    ripeIds: Damage["ripeIds"] = [];
  // A stable order makes displayed, rounded contributions independent of acquisition order.
  for (const id of matched) {
    const a = abilities.find((a) => a.id === id)!;
    const ripe = a.ripe === 3 || a.lingering;
    const amount = Math.round(total * bonus(a) * (ripe ? 2 : 1));
    total += amount;
    lines.push({ name: id, amount, ripe });
    if (a.ripe === 3) ripeIds.push(id);
  }
  const echo =
    lastDifference === s.difference ? Math.min(3, previousEcho + 1) : 0;
  if (abilities.some((a) => a.id === "ECHO") && echo) {
    const amount = Math.round(total * echo * 0.3);
    total += amount;
    lines.push({ name: "ECHO", amount, ripe: false });
  }
  if (mutation === "DOUBLE CORE" && matched.length >= 2) {
    const amount = Math.round(total * 0.3);
    total += amount;
    lines.push({ name: "DOUBLE CORE", amount, ripe: false });
  }
  return { base, total, lines, matched, ripeIds, echo };
}
export function bestSequence(
  board: Board,
  path: number[],
  abilities: Ability[],
  mutation?: Mutation,
  lastDifference?: number,
  echo = 0,
): { sequence: Sequence; damage: Damage } | undefined {
  if (path.length < 3) return;
  return candidates(board, path)
    .map((sequence) => ({
      sequence,
      damage: calculateDamage(
        sequence,
        abilities,
        mutation,
        lastDifference,
        echo,
      ),
    }))
    .sort((a, b) => b.damage.total - a.damage.total)[0];
}
