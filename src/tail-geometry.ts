import type { Point, Rat } from './generator';

export const tailPath = (rat: Rat): Point[] => rat.path ?? rat.points;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Broad quadratic bends joined with matching tangents, then sampled for BOTH rules and rendering. */
export function organicPath(anchors: Point[], warp: (point: Point) => Point): Point[] {
  const result: Point[] = [anchors[0]];
  const line = (a: Point, b: Point) => {
    const steps = Math.max(1, Math.ceil(distance(a, b) / 10));
    for (let i = 1; i <= steps; i++) result.push({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps });
  };
  let start = midpoint(anchors[0], anchors[1]);
  line(anchors[0], start);
  for (let i = 1; i < anchors.length - 1; i++) {
    const control = anchors[i], end = midpoint(control, anchors[i + 1]);
    const steps = Math.max(8, Math.ceil((distance(start, control) + distance(control, end)) / 10));
    for (let j = 1; j <= steps; j++) {
      const t = j / steps, u = 1 - t;
      result.push({ x: u * u * start.x + 2 * u * t * control.x + t * t * end.x, y: u * u * start.y + 2 * u * t * control.y + t * t * end.y });
    }
    start = end;
  }
  line(start, anchors[anchors.length - 1]);
  return result.map(warp);
}

interface Segment { id: number; owner: number; index: number; a: Point; b: Point }
export interface PathCrossing extends Point { a: number; b: number }

function hit(a: Segment, b: Segment): (Point & { sine: number }) | null {
  if (Math.max(a.a.x, a.b.x) + 0.001 < Math.min(b.a.x, b.b.x) || Math.max(b.a.x, b.b.x) + 0.001 < Math.min(a.a.x, a.b.x)
    || Math.max(a.a.y, a.b.y) + 0.001 < Math.min(b.a.y, b.b.y) || Math.max(b.a.y, b.b.y) + 0.001 < Math.min(a.a.y, a.b.y)) return null;
  const rx = a.b.x - a.a.x, ry = a.b.y - a.a.y, sx = b.b.x - b.a.x, sy = b.b.y - b.a.y;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < 0.00001) return null;
  const t = ((b.a.x - a.a.x) * sy - (b.a.y - a.a.y) * sx) / denominator;
  const u = ((b.a.x - a.a.x) * ry - (b.a.y - a.a.y) * rx) / denominator;
  if (t < -0.00001 || t > 1.00001 || u < -0.00001 || u > 1.00001) return null;
  return { x: a.a.x + t * rx, y: a.a.y + t * ry, sine: Math.abs(denominator) / Math.hypot(rx, ry) / Math.hypot(sx, sy) };
}

/** A spatial index avoids comparing every sample with every sample of every other tail. */
export function analysePaths(paths: Point[][]): { crossings: PathCrossing[]; selfIntersection: boolean; shallowCrossing: boolean } {
  const buckets = new Map<string, Segment[]>();
  const crossings: PathCrossing[] = [];
  let selfIntersection = false, shallowCrossing = false, sequence = 0;
  paths.forEach((points, owner) => {
    for (let index = 1; index < points.length; index++) {
      const segment: Segment = { id: sequence++, owner, index, a: points[index - 1], b: points[index] };
      const minX = Math.floor(Math.min(segment.a.x, segment.b.x) / 56), maxX = Math.floor(Math.max(segment.a.x, segment.b.x) / 56);
      const minY = Math.floor(Math.min(segment.a.y, segment.b.y) / 56), maxY = Math.floor(Math.max(segment.a.y, segment.b.y) / 56);
      const keys: string[] = [], visited = new Set<number>();
      for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
        const key = `${x}/${y}`; keys.push(key);
        for (const previous of buckets.get(key) ?? []) {
          if (visited.has(previous.id) || (previous.owner === owner && Math.abs(previous.index - index) <= 1)) continue;
          visited.add(previous.id);
          const point = hit(segment, previous);
          if (!point) continue;
          if (previous.owner === owner) { selfIntersection = true; continue; }
          const a = Math.min(owner, previous.owner), b = Math.max(owner, previous.owner);
          // Adjacent sampled segments can report the same geometric crossing twice.
          if (!crossings.some(c => c.a === a && c.b === b && distance(c, point) < 0.75)) {
            crossings.push({ x: point.x, y: point.y, a, b });
          }
          if (point.sine < 0.28) shallowCrossing = true;
        }
      }
      for (const key of keys) {
        const bucket = buckets.get(key);
        if (bucket) bucket.push(segment); else buckets.set(key, [segment]);
      }
    }
  });
  return { crossings, selfIntersection, shallowCrossing };
}
