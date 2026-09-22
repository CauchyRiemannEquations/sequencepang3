import { acquire, draft, isPattern } from "./abilities";
import { attack, createBattle } from "./battle";
import type { AbilityId, EnemyId, Mutation, RNG, Run } from "./types";
export const STAGES = [
  "SEED",
  "LOCK",
  "MUTATION",
  "BLACK SEED",
  "MUTANT",
  "REST",
  "THE SPLITTER",
] as const;
export function newRun(screen: Run["screen"] = "battle"): Run {
  return {
    screen,
    stage: 1,
    battle: createBattle("SEED"),
    abilities: [],
    rewards: [],
    stats: {
      highestDamage: 0,
      longest: 0,
      ripeCount: 0,
      attacks: 0,
      startedAt: Date.now(),
    },
  };
}
export function victory(run: Run, rng: RNG = Math.random): Run {
  return {
    ...run,
    battle: { ...run.battle, hp: 0 },
    screen: run.stage === 7 ? "clear" : "reward",
    rewards:
      run.stage === 1
        ? ["EVEN", "D2", "LONG"]
        : draft(run.abilities, run.stage === 4, rng),
  };
}
export function playAttack(run: Run, path: number[], rng: RNG = Math.random) {
  if (run.screen !== "battle") return;
  const result = attack(run.battle, run.abilities, path, run.mutation, rng);
  if (!result) return;
  let next: Run = {
    ...run,
    battle: result.battle,
    abilities: result.abilities,
    lastDamage: result.damage,
    stats: {
      ...run.stats,
      highestDamage: Math.max(run.stats.highestDamage, result.damage.total),
      longest: Math.max(run.stats.longest, path.length),
      ripeCount: run.stats.ripeCount + result.damage.ripeIds.length,
      attacks: run.stats.attacks + 1,
    },
  };
  if (result.won) next = victory(next, rng);
  else if (result.lost) next = { ...next, screen: "over" };
  return { run: next, ...result };
}
export function nextStage(run: Run): Run {
  const stage = run.stage + 1;
  if (stage === 3) return { ...run, stage, screen: "mutation" };
  if (stage === 6) return { ...run, stage, screen: "rest" };
  return {
    ...run,
    stage,
    screen: "battle",
    battle: createBattle(STAGES[stage - 1] as EnemyId, run.mutation),
    lastDamage: undefined,
    abilities: run.abilities.map((a) => ({
      ...a,
      lingering: false,
      ripe: stage === 7 && a.id === run.juice ? 2 : a.ripe,
    })),
  };
}
export const chooseReward = (run: Run, id: AbilityId) =>
  nextStage({ ...run, abilities: acquire(run.abilities, id), rewards: [] });
export const chooseMutation = (run: Run, mutation: Mutation) =>
  nextStage({ ...run, mutation });
export function rest(
  run: Run,
  kind: "GROW" | "JUICE" | "PRUNE",
  id: AbilityId,
  replacement?: AbilityId,
): Run {
  if (kind === "GROW")
    return nextStage({ ...run, abilities: acquire(run.abilities, id) });
  if (kind === "JUICE") return nextStage({ ...run, juice: id });
  const abilities = run.abilities.filter((a) => a.id !== id);
  return replacement
    ? nextStage({ ...run, abilities: acquire(abilities, replacement) })
    : run;
}
export function jumpBoss(run: Run): Run {
  return {
    ...run,
    stage: 7,
    screen: "battle",
    battle: createBattle("THE SPLITTER", run.mutation),
    abilities: run.abilities.map((a) => ({ ...a, lingering: false })),
  };
}
export const fillRipe = (run: Run): Run => ({
  ...run,
  abilities: run.abilities.map((a) =>
    isPattern(a.id) ? { ...a, ripe: 3 } : a,
  ),
});
