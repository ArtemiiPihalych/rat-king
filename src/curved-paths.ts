import type { Point } from './generator';
import { wovenRats, type WovenRat } from './woven-paths';
import { organicPath } from './tail-geometry';

export interface CurvedRat extends WovenRat { path: Point[] }

export function curvedRats(random: () => number, count: number): CurvedRat[] | null {
  const base = wovenRats(random, count, count >= 8 ? 6 : 8);
  if (!base) return null;
  const strength = (0.3 + random() * 0.35) * (random() < 0.5 ? -1 : 1);
  // One smooth, invertible radial twist makes the whole knot flow organically.
  const warp = (point: Point): Point => {
    const x = point.x - 420, y = point.y - 420, radius = Math.hypot(x, y);
    const twist = radius < 400 ? strength * Math.sin(Math.PI * radius / 400) ** 2 : 0;
    return { x: 420 + x * Math.cos(twist) - y * Math.sin(twist), y: 420 + x * Math.sin(twist) + y * Math.cos(twist) };
  };
  const result = base.map(rat => {
    const points = rat.points.map(warp), path = organicPath(rat.points, warp);
    const angle = Math.atan2(path[0].y - path[1].y, path[0].x - path[1].x);
    // The nonlinear warp changes distances: anchor the body to the visible tail, not its old grid position.
    const position = { x: path[0].x + Math.cos(angle) * 34, y: path[0].y + Math.sin(angle) * 34 };
    return { position, points, angle, path };
  });
  for (const rat of result) for (let i = 1; i < rat.path.length - 1; i++) {
    const a = rat.path[i - 1], b = rat.path[i], c = rat.path[i + 1];
    const ux = b.x - a.x, uy = b.y - a.y, vx = c.x - b.x, vy = c.y - b.y;
    const cosine = (ux * vx + uy * vy) / Math.hypot(ux, uy) / Math.hypot(vx, vy);
    // Reject tiny compressed hairpins instead of drawing an almost-cusp after the twist.
    if (!(cosine > 0.7)) return null;
  }
  return result;
}
