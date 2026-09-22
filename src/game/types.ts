export type RNG = () => number;
export type Tile = {
  id: number;
  value: number;
  locked?: boolean;
  wild?: boolean;
  fall?: number;
};
export type Board = Tile[];
export type Crack = { axis: "vertical" | "horizontal"; position: number };
export type Sequence = { values: number[]; difference: number; length: number };
export type AbilityId =
  | "EVEN"
  | "ODD"
  | "D1"
  | "D2"
  | "SHORT"
  | "FOUR"
  | "LONG"
  | "ECHO"
  | "BURST"
  | "SWAP"
  | "REROLL";
export type Ability = {
  id: AbilityId;
  level: number;
  ripe: number;
  lingering: boolean;
};
export type Mutation = "JUICY" | "DOUBLE CORE" | "WILD";
export type EnemyId =
  | "SEED"
  | "LOCK"
  | "MUTANT"
  | "BLACK SEED"
  | "THE SPLITTER";
export type DamageLine = { name: string; amount: number; ripe: boolean };
export type Damage = {
  base: number;
  total: number;
  lines: DamageLine[];
  matched: AbilityId[];
  ripeIds: AbilityId[];
  echo: number;
};
export type Battle = {
  board: Board;
  enemy: EnemyId;
  hp: number;
  turn: number;
  crack?: Crack;
  phase: 1 | 2;
  phaseTurn: number;
  lastDifference?: number;
  echo: number;
  usedSwap: boolean;
  usedReroll: boolean;
  notice: string;
};
export type Stats = {
  highestDamage: number;
  longest: number;
  ripeCount: number;
  attacks: number;
  startedAt: number;
};
export type Screen =
  | "home"
  | "battle"
  | "reward"
  | "mutation"
  | "rest"
  | "over"
  | "clear";
export type Run = {
  screen: Screen;
  stage: number;
  battle: Battle;
  abilities: Ability[];
  mutation?: Mutation;
  rewards: AbilityId[];
  stats: Stats;
  lastDamage?: Damage;
  juice?: AbilityId;
};
