import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { LockKeyhole } from "lucide-react";
import type { Board as BoardType, Crack } from "../game/types";
import { Seed } from "./Symbols";
type Props = {
  board: BoardType;
  path: number[];
  crack?: Crack;
  disabled: boolean;
  popping: number[];
  ripe: boolean;
  invalid: number | null;
  swap: number | null;
  onStart: (i: number) => void;
  onAdd: (i: number) => void;
  onEnd: () => void;
  onCancel: () => void;
  onKeyboard: (i: number) => void;
};
export default function Board(p: Props) {
  const ref = useRef<HTMLDivElement>(null),
    active = useRef<number | null>(null),
    last = useRef<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rowHeight = (ref.current?.getBoundingClientRect().height ?? 0) / 6;
    p.board.forEach((tile, index) => {
      if (tile.fall)
        ref.current?.querySelector(`[data-index="${index}"]`)?.animate(
          [
            {
              transform: `translateY(${-tile.fall * rowHeight}px)`,
              opacity: 0.4,
            },
            { transform: "translateY(0)", opacity: 1 },
          ],
          { duration: 220, easing: "cubic-bezier(.2,.7,.3,1)" },
        );
    });
  }, [p.board]);
  const hit = (x: number, y: number) => {
    const r = ref.current!.getBoundingClientRect();
    const col = Math.floor(((x - r.left) / r.width) * 6),
      row = Math.floor(((y - r.top) / r.height) * 6);
    return x >= r.left &&
      x < r.right &&
      y >= r.top &&
      y < r.bottom &&
      col >= 0 &&
      col < 6 &&
      row >= 0 &&
      row < 6
      ? row * 6 + col
      : -1;
  };
  const cancel = () => {
    if (active.current !== null) {
      active.current = null;
      last.current = null;
      p.onCancel();
    }
  };
  return (
    <div className={`board-shell ${p.ripe ? "ripe-board" : ""}`}>
      <div
        className="board"
        ref={ref}
        role="group"
        aria-label="6 곱하기 6 숫자 보드"
        onPointerDown={(e) => {
          if (p.disabled || active.current !== null || e.button !== 0) return;
          const i = hit(e.clientX, e.clientY);
          if (i < 0) return;
          e.preventDefault();
          active.current = e.pointerId;
          last.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
          p.onStart(i);
        }}
        onPointerMove={(e) => {
          if (active.current !== e.pointerId || p.disabled) return;
          e.preventDefault();
          const prev = last.current ?? { x: e.clientX, y: e.clientY };
          const distance = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
          const steps = Math.max(1, Math.ceil(distance / 8));
          for (let n = 1; n <= steps; n++) {
            const i = hit(
              prev.x + ((e.clientX - prev.x) * n) / steps,
              prev.y + ((e.clientY - prev.y) * n) / steps,
            );
            if (i >= 0) p.onAdd(i);
          }
          last.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (active.current !== e.pointerId) return;
          active.current = null;
          last.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          p.onEnd();
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {p.board.map((t, i) => (
          <button
            key={t.id}
            data-index={i}
            data-value={t.wild ? "?" : t.value}
            disabled={p.disabled || t.locked}
            aria-label={`${Math.floor(i / 6) + 1}행 ${(i % 6) + 1}열, ${t.locked ? "잠김" : t.wild ? "와일드" : t.value}`}
            aria-pressed={p.path.includes(i)}
            className={`tile ${p.path.includes(i) ? "selected" : ""} ${t.locked ? "locked" : ""} ${t.wild ? "wild" : ""} ${p.popping.includes(i) ? "popping" : ""} ${p.invalid === i ? "invalid" : ""} ${p.swap === i ? "swap-selected" : ""}`}
            style={{ "--fall": t.fall || 0 } as CSSProperties}
            onClick={(e) => {
              if (e.detail === 0 && !p.disabled) p.onKeyboard(i);
            }}
            onKeyDown={(e) => {
              const delta = (
                {
                  ArrowRight: 1,
                  ArrowLeft: -1,
                  ArrowUp: -6,
                  ArrowDown: 6,
                } as Record<string, number>
              )[e.key];
              if (delta) {
                e.preventDefault();
                const next = i + delta;
                if (next >= 0 && next < 36)
                  ref.current
                    ?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)
                    ?.focus();
              }
              if (e.key === "Escape") p.onCancel();
            }}
          >
            <span className="tile-number">
              {t.locked ? <LockKeyhole size={23} /> : t.wild ? "?" : t.value}
            </span>
            <span className="tile-seeds">
              <Seed />
              <Seed />
            </span>
            {p.path.includes(i) && (
              <span className="path-order">{p.path.indexOf(i) + 1}</span>
            )}
          </button>
        ))}
        <svg
          className={`path-line ${p.ripe ? "ripe-line" : ""}`}
          viewBox="0 0 600 600"
          aria-hidden="true"
        >
          <polyline
            points={p.path
              .map(
                (i) => `${(i % 6) * 100 + 50},${Math.floor(i / 6) * 100 + 50}`,
              )
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {p.crack && (
          <div
            className={`crack ${p.crack.axis}`}
            style={
              {
                "--position": `${(p.crack.position / 6) * 100}%`,
              } as CSSProperties
            }
          >
            <span />
          </div>
        )}
      </div>
    </div>
  );
}
