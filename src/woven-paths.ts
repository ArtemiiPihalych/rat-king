import type { Point } from './generator';

const STEP = 28;
const ORIGIN = 168;
const LAST = 18;
type Cell = { owner: number; horizontal: boolean; corner: boolean };
export interface WovenRat { angle: number; position: Point; points: Point[] }

function shuffled<T>(array: T[], random: () => number): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Route on shared lanes. Crossings can only be straight-over-straight, never corners or tips. */
export function wovenRats(random: () => number, count: number, maximumLength = 8): WovenRat[] | null {
  const occupied = new Map<number, Cell[]>();
  const sideOffset = Math.floor(random() * 4);
  const rotation = Math.floor(random() * 4);
  const specs = Array.from({ length: count }, (_, owner) => {
    const side = (owner + sideOffset) % 4;
    const peers = Array.from({ length: count }, (_, i) => i).filter(i => (i + sideOffset) % 4 === side);
    const index = peers.indexOf(owner);
    const slots = peers.length === 3 ? [3, 9, 15] : peers.length === 2 ? [5, 13] : [9];
    const lane = slots[index] + Math.floor(random() * 3) - 1;
    const coordinate = ORIGIN + STEP * lane;
    const positions = [{ x: coordinate, y: 98 }, { x: 742, y: coordinate }, { x: coordinate, y: 742 }, { x: 98, y: coordinate }];
    const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const angle = angles[side], position = positions[side];
    const root = { x: position.x - Math.cos(angle) * 29, y: position.y - Math.sin(angle) * 29 };
    return { owner, side, angle, position, root, turns: random() < 0.5 ? 5 : 6 };
  });
  const paths = new Map<number, Point[]>();
  const placementOrder = shuffled(specs.slice(), random);

  function addSegment(a: Point, b: Point, owner: number): number[] | null {
    const horizontal = Math.abs(a.y - b.y) < 0.01;
    const ax = Math.round((a.x - ORIGIN) / STEP), ay = Math.round((a.y - ORIGIN) / STEP);
    const bx = Math.round((b.x - ORIGIN) / STEP), by = Math.round((b.y - ORIGIN) / STEP);
    const from = Math.max(0, horizontal ? Math.min(ax, bx) : Math.min(ay, by));
    const to = Math.min(LAST, horizontal ? Math.max(ax, bx) : Math.max(ay, by));
    const entries: { key: number; cell: Cell }[] = [];
    for (let k = from; k <= to; k++) {
      const x = horizontal ? k : bx, y = horizontal ? by : k;
      if (x < 0 || x > LAST || y < 0 || y > LAST) return null;
      const key = y * (LAST + 1) + x;
      const cells = occupied.get(key) ?? [];
      const isStart = x === ax && y === ay;
      const isEnd = x === bx && y === by;
      if (isStart && cells.length === 1 && cells[0].owner === owner) continue;
      if (cells.some(c => c.owner === owner) || cells.length > 1) return null;
      if (cells.length && (isStart || isEnd || cells[0].corner || cells[0].horizontal === horizontal)) return null;
      entries.push({ key, cell: { owner, horizontal, corner: isStart || isEnd } });
    }
    for (const { key, cell } of entries) occupied.set(key, [...(occupied.get(key) ?? []), cell]);
    return entries.map(e => e.key);
  }
  function undo(keys: number[]): void {
    for (const key of keys) {
      const cells = occupied.get(key)!;
      if (cells.length === 1) occupied.delete(key);
      else occupied.set(key, cells.slice(0, -1));
    }
  }

  for (const spec of placementOrder) {
    let budget = 900;
    const points = [spec.root];
    const initial = [{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }][spec.side];
    const segmentCount = spec.turns + 1;
    function route(previousDirection: Point, segment: number): boolean {
      if (--budget < 0) return false;
      if (segment === segmentCount) return true;
      const previous = points[points.length - 1];
      const directions = segment === 0 ? [initial] : shuffled([
        { x: -previousDirection.y, y: previousDirection.x },
        { x: previousDirection.y, y: -previousDirection.x },
      ], random);
      for (const direction of directions) {
        // First segment enters from a rat outside the lanes; all subsequent corners stay inside.
        const lengths = shuffled(Array.from({ length: segment === 0 ? 10 : maximumLength - 1 }, (_, i) => i + 2), random);
        for (const length of lengths) {
          const start = segment === 0
            ? { x: Math.max(ORIGIN, Math.min(ORIGIN + LAST * STEP, previous.x)), y: Math.max(ORIGIN, Math.min(ORIGIN + LAST * STEP, previous.y)) }
            : previous;
          const end = { x: start.x + direction.x * length * STEP, y: start.y + direction.y * length * STEP };
          const gx = Math.round((end.x - ORIGIN) / STEP), gy = Math.round((end.y - ORIGIN) / STEP);
          if (gx < 1 || gx >= LAST || gy < 1 || gy >= LAST) continue;
          const keys = addSegment(previous, end, spec.owner);
          if (!keys) continue;
          points.push(end);
          if (route(direction, segment + 1)) return true;
          points.pop(); undo(keys);
          if (budget < 0) return false;
        }
      }
      return false;
    }
    if (!route(initial, 0)) return null;
    paths.set(spec.owner, points.slice());
  }
  const rotate = (point: Point): Point => {
    const x = point.x - 420, y = point.y - 420;
    if (rotation === 1) return { x: 420 - y, y: 420 + x };
    if (rotation === 2) return { x: 420 - x, y: 420 - y };
    if (rotation === 3) return { x: 420 + y, y: 420 - x };
    return point;
  };
  return specs.map(spec => ({ angle: spec.angle + rotation * Math.PI / 2, position: rotate(spec.position), points: paths.get(spec.owner)!.map(rotate) }));
}
