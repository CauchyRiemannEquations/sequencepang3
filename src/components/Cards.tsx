import { ArrowRight, ArrowUpRight, Zap } from "lucide-react";
import { Seed } from "./Symbols";
import { ABILITIES, isPattern } from "../game/abilities";
import type { Ability, AbilityId, Mutation } from "../game/types";
export const roman = ["", "I", "II", "III"];
export const mutationDescriptions: Record<Mutation, string> = {
  JUICY: "RIPE 보너스가 다음 공격까지 한 번 더.",
  "DOUBLE CORE": "Pattern 2개 동시 만족 시 최종 데미지 +30%.",
  WILD: "전투마다 숫자가 자유로운 ? 타일 하나.",
};
export function Seeds({ value }: { value: number }) {
  return (
    <span
      className={`seed-meter ${value === 3 ? "full" : ""}`}
      aria-label={`RIPE ${value}/3`}
    >
      {[0, 1, 2].map((i) => (
        <Seed key={i} className={i < value ? "filled" : ""} />
      ))}
    </span>
  );
}
export function AbilityCard({
  id,
  owned,
  onClick,
  rare = false,
}: {
  id: AbilityId;
  owned?: Ability;
  onClick: () => void;
  rare?: boolean;
}) {
  const def = ABILITIES[id],
    level = (owned?.level ?? 0) + 1;
  return (
    <button
      className={`choice-card ${rare ? "rare-card" : ""}`}
      onClick={onClick}
    >
      <span className="card-top">
        <Seed />
        <span>
          {rare ? "RARE" : def.category.toUpperCase()}
          {owned ? " · LEVEL UP" : ""}
        </span>
        <ArrowUpRight size={18} />
      </span>
      <strong>
        {id} {level > 1 && <small>{roman[level]}</small>}
      </strong>
      <span className="card-description">
        {owned && def.bonuses
          ? `${def.detail} · +${Math.round(def.bonuses[level - 1] * 100)}%`
          : def.description}
      </span>
      <span className="card-bottom">
        {isPattern(id) ? (
          <>
            <Seeds value={owned?.ripe ?? 0} />
            <span>RIPE</span>
          </>
        ) : (
          <>
            <Zap size={14} />
            <span>
              {def.category === "Utility" ? "매 전투 사용 가능" : "항상 활성"}
            </span>
          </>
        )}
      </span>
    </button>
  );
}
export function RipeGuide() {
  return (
    <div className="ripe-guide">
      <div>
        <Seed />
        <strong>LET IT RIPE.</strong>
      </div>
      <p>
        조건을 3번 채우고,
        <br />
        다음 한 수에 보너스 2배.
      </p>
      <span>
        <Seeds value={3} />
        <ArrowRight size={14} />
        <strong>×2</strong>
      </span>
    </div>
  );
}
