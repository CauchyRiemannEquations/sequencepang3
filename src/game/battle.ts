import { generateBoard, ensurePlayable } from "./board";
import { bestSequence } from "./damage";
import { ENEMIES, enemyBehavior } from "./enemies";
import { adjacent, legalPath } from "./path";
import { gravityRefill } from "./gravity";
import { advanceRipe } from "./ripe";
import type { Ability, Battle, EnemyId, Mutation, RNG } from "./types";
export function createBattle(
  enemy: EnemyId,
  mutation?: Mutation,
  rng: RNG = Math.random,
): Battle {
  const crack =
    enemy === "THE SPLITTER"
      ? { axis: "vertical" as const, position: 3 }
      : undefined;
  return {
    board: generateBoard(rng, mutation === "WILD", crack),
    enemy,
    hp: ENEMIES[enemy].hp,
    turn: 0,
    crack,
    phase: 1,
    phaseTurn: 0,
    echo: 0,
    usedSwap: false,
    usedReroll: false,
    notice: "",
  };
}
export function attack(
  b: Battle,
  abilities: Ability[],
  path: number[],
  mutation?: Mutation,
  rng: RNG = Math.random,
) {
  if (
    b.hp <= 0 ||
    b.turn >= ENEMIES[b.enemy].turns ||
    !legalPath(b.board, path, b.crack)
  )
    return;
  const result = bestSequence(
    b.board,
    path,
    abilities,
    mutation,
    b.lastDifference,
    b.echo,
  );
  if (!result) return;
  const removed = [...path];
  if (abilities.some((a) => a.id === "BURST") && path.length >= 4) {
    const available = b.board
      .map((t, i) =>
        !removed.includes(i) &&
        !t.locked &&
        !t.wild &&
        adjacent(path[path.length - 1], i)
          ? i
          : -1,
      )
      .filter((i) => i >= 0);
    if (available.length)
      removed.push(available[Math.floor(rng() * available.length)]);
  }
  const ripe = advanceRipe(abilities, result.damage, mutation);
  let battle: Battle = {
    ...b,
    board: gravityRefill(b.board, removed, rng),
    hp: Math.max(0, b.hp - result.damage.total),
    turn: b.turn + 1,
    lastDifference: result.sequence.difference,
    echo: result.damage.echo,
    notice: "",
  };
  const won = battle.hp === 0,
    lost = !won && battle.turn >= ENEMIES[b.enemy].turns;
  if (!won && !lost) {
    battle = enemyBehavior(battle, rng);
    const playable = ensurePlayable(battle.board, battle.crack, rng);
    battle.board = playable.board;
    if (playable.rescued)
      battle.notice = "가능한 수열이 없어 무료로 보드를 정리했습니다";
  }
  return {
    battle,
    abilities: ripe.abilities,
    ready: ripe.ready,
    damage: result.damage,
    sequence: result.sequence,
    removed,
    won,
    lost,
  };
}
export function swapTiles(battle: Battle, a: number, b: number): Battle {
  if (
    battle.usedSwap ||
    a === b ||
    !battle.board[a] ||
    !battle.board[b] ||
    battle.board[a].locked ||
    battle.board[b].locked
  )
    return battle;
  const board = [...battle.board];
  [board[a], board[b]] = [board[b], board[a]];
  return {
    ...battle,
    board: ensurePlayable(board, battle.crack).board,
    usedSwap: true,
    notice: "두 타일을 교환했습니다 · 턴 소모 없음",
  };
}
export function rerollBoard(battle: Battle, rng: RNG = Math.random): Battle {
  if (battle.usedReroll) return battle;
  const fresh = generateBoard(rng);
  const board = fresh.map((t, i) => ({
    ...t,
    locked: battle.board[i].locked,
    wild: battle.board[i].wild,
  }));
  return {
    ...battle,
    board: ensurePlayable(board, battle.crack, rng).board,
    usedReroll: true,
    notice: "새로운 보드 · 턴 소모 없음",
  };
}
