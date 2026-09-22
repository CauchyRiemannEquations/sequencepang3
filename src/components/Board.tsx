import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { LockKeyhole } from "lucide-react";
import type { Board as BoardType, Crack } from "../game/types";
import {
  DRAG_HIT_RADIUS,
  dragHits,
  type DragTarget,
  type Point,
} from "../game/dragHit";
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
    gestureBoard = useRef<BoardType | null>(null),
    last = useRef<Point | null>(null),
    targets = useRef<DragTarget[]>([]),
    lastHit = useRef<number | null>(null);
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
  const measureTargets = () => {
    const board = ref.current!;
    const bounds = board.getBoundingClientRect();
    const scaleX = bounds.width / board.offsetWidth,
      scaleY = bounds.height / board.offsetHeight;
    // Layout offsets ignore the tiles' falling/selected animation transforms.
    return Array.from(board.querySelectorAll<HTMLButtonElement>("[data-index]"))
      .map((tile) => ({
        index: Number(tile.dataset.index),
        x:
          bounds.left +
          (board.clientLeft + tile.offsetLeft + tile.offsetWidth / 2) * scaleX,
        y:
          bounds.top +
          (board.clientTop + tile.offsetTop + tile.offsetHeight / 2) * scaleY,
        width: tile.offsetWidth * scaleX,
        height: tile.offsetHeight * scaleY,
        radius:
          Math.min(tile.offsetWidth * scaleX, tile.offsetHeight * scaleY) *
          DRAG_HIT_RADIUS,
      }));
  };
  const cancel = () => {
    if (active.current !== null) {
      const pointerId = active.current;
      active.current = null;
      gestureBoard.current = null;
      last.current = null;
      lastHit.current = null;
      targets.current = [];
      if (ref.current?.hasPointerCapture(pointerId))
        ref.current.releasePointerCapture(pointerId);
      p.onCancel();
    }
  };
  useLayoutEffect(() => {
    // A swap/reroll must not turn the remainder of its gesture into an attack.
    if (p.disabled || (gestureBoard.current && gestureBoard.current !== p.board))
      cancel();
  }, [p.disabled, p.board]);

  const moveTo = (point: Point) => {
    const previous = last.current ?? point;
    for (const i of dragHits(previous, point, targets.current)) {
      // Remaining inside a tile must not retry invalid moves or backtrack twice.
      if (i !== lastHit.current) {
        lastHit.current = i;
        p.onAdd(i);
      }
    }
    last.current = point;
  };
  const followPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    for (const sample of e.nativeEvent.getCoalescedEvents?.() ?? [])
      moveTo({ x: sample.clientX, y: sample.clientY });
    moveTo({ x: e.clientX, y: e.clientY });
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
          const measured = measureTargets();
          // A tap may start anywhere on a tile; only dragging needs a centre hit.
          const first = measured.find(
            (t) =>
              Math.abs(e.clientX - t.x) <= t.width / 2 &&
              Math.abs(e.clientY - t.y) <= t.height / 2,
          );
          if (!first || p.board[first.index].locked) return;
          e.preventDefault();
          active.current = e.pointerId;
          gestureBoard.current = p.board;
          last.current = { x: e.clientX, y: e.clientY };
          targets.current = measured;
          lastHit.current = first.index;
          e.currentTarget.setPointerCapture(e.pointerId);
          p.onStart(first.index);
        }}
        onPointerMove={(e) => {
          if (active.current !== e.pointerId || p.disabled) return;
          e.preventDefault();
          followPointer(e);
        }}
        onPointerUp={(e) => {
          if (active.current !== e.pointerId) return;
          if (p.disabled) {
            cancel();
            return;
          }
          // Some phones release over the final tile before a final move arrives.
          followPointer(e);
          active.current = null;
          gestureBoard.current = null;
          last.current = null;
          lastHit.current = null;
          targets.current = [];
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          p.onEnd();
        }}
        onPointerCancel={(e) => {
          if (active.current === e.pointerId) cancel();
        }}
        onLostPointerCapture={(e) => {
          if (active.current === e.pointerId) cancel();
        }}
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
              if (e.key === "Escape") {
                if (active.current !== null) cancel();
                else p.onCancel();
              }
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
