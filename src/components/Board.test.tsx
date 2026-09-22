import { describe, expect, it, vi } from "vitest";
import Board from "./Board";
import { extendPath } from "../game/path";

// Exercise the actual handlers without adding a DOM dependency. The browser
// checks separately cover layout and native pointer capture.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useRef: (current: unknown) => ({ current }),
  useLayoutEffect: () => {},
}));

function setup() {
  const board = Array.from({ length: 36 }, (_, id) => ({ id, value: 9 }));
  [0, 7, 14].forEach((index, order) => (board[index].value = order + 1));
  let path: number[] = [];
  const commits: number[][] = [];
  const onCancel = vi.fn(() => (path = []));
  const rendered = Board({
    board,
    path: [],
    disabled: false,
    popping: [],
    ripe: false,
    invalid: null,
    swap: null,
    onStart: (index) => (path = extendPath(board, [], index)),
    onAdd: (index) => (path = extendPath(board, path, index)),
    onEnd: () => commits.push([...path]),
    onCancel,
    onKeyboard: () => {},
  });
  const grid = rendered.props.children;
  let captured = false;
  const node = {
    offsetWidth: 300,
    offsetHeight: 300,
    clientLeft: 0,
    clientTop: 0,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }),
    querySelectorAll: () =>
      board.map((_, index) => ({
        dataset: { index },
        offsetLeft: (index % 6) * 50 + 3,
        offsetTop: Math.floor(index / 6) * 50 + 3,
        offsetWidth: 44,
        offsetHeight: 44,
      })),
    setPointerCapture: () => (captured = true),
    hasPointerCapture: () => captured,
    releasePointerCapture: () => (captured = false),
  };
  grid.props.ref.current = node;
  const event = (index: number) => ({
    pointerId: 1,
    button: 0,
    clientX: (index % 6) * 50 + 25,
    clientY: Math.floor(index / 6) * 50 + 25,
    nativeEvent: {},
    currentTarget: node,
    preventDefault: () => {},
  });
  return { grid, event, commits, onCancel, captured: () => captured };
}

describe("Board gesture completion", () => {
  it("adds the final release segment before committing when no move event arrived", () => {
    const { grid, event, commits, captured } = setup();
    grid.props.onPointerDown(event(0));
    grid.props.onPointerUp(event(14));
    expect(commits).toEqual([[0, 7, 14]]);
    expect(captured()).toBe(false);
  });

  it("cancels a valid selection without submitting it or handling a later release", () => {
    const { grid, event, commits, onCancel, captured } = setup();
    grid.props.onPointerDown(event(0));
    grid.props.onPointerMove(event(14));
    grid.props.onPointerCancel(event(14));
    grid.props.onPointerUp(event(14));
    expect(commits).toEqual([]);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(captured()).toBe(false);
  });
});
