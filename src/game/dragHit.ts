export type Point = { x: number; y: number };
export type DragTarget = Point & { index: number; radius: number };

/** Keep corner grazes between diagonal neighbours outside the selection area. */
export const DRAG_HIT_RADIUS = 0.34;

/**
 * Return every tile centre crossed by a pointer segment, in travel order.
 * A swept circle test also catches tiles between sparse mobile pointer events.
 */
export function dragHits(
  from: Point,
  to: Point,
  targets: readonly DragTarget[],
): number[] {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    lengthSquared = dx * dx + dy * dy;
  const hits: { index: number; entry: number }[] = [];

  for (const target of targets) {
    const x = from.x - target.x,
      y = from.y - target.y,
      outside = x * x + y * y - target.radius * target.radius;

    if (outside <= 0) {
      hits.push({ index: target.index, entry: 0 });
      continue;
    }
    if (lengthSquared === 0) continue;

    const projection = x * dx + y * dy,
      discriminant = projection * projection - lengthSquared * outside;
    if (discriminant < 0) continue;

    const entry = (-projection - Math.sqrt(discriminant)) / lengthSquared;
    if (entry >= 0 && entry <= 1)
      hits.push({ index: target.index, entry });
  }

  return hits.sort((a, b) => a.entry - b.entry).map((hit) => hit.index);
}
