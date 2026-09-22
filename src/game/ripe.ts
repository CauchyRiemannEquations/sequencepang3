import type { Ability, Damage, Mutation } from "./types";
export function advanceRipe(
  abilities: Ability[],
  damage: Damage,
  mutation?: Mutation,
): { abilities: Ability[]; ready: string[] } {
  const ready: string[] = [];
  return {
    abilities: abilities.map((a) => {
      const matched = damage.matched.includes(a.id),
        triggered = damage.ripeIds.includes(a.id);
      const ripe = triggered ? 0 : matched ? Math.min(3, a.ripe + 1) : a.ripe;
      if (ripe === 3 && a.ripe < 3) ready.push(a.id);
      return { ...a, ripe, lingering: mutation === "JUICY" && triggered };
    }),
    ready,
  };
}
