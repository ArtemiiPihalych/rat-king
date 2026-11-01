/** Deterministic geometry and game rules. No renderer or browser dependencies. */
import { wovenRats } from './woven-paths';
import { curvedRats } from './curved-paths';
import { analysePaths, tailPath } from './tail-geometry';
export const GENERATOR_VERSION = 3;
export const BOARD_SIZE = 840;
export type Difficulty = 'cozy' | 'curious' | 'clever';
export interface Point { x: number; y: number }
export interface Rat { id: number; name: string; angle: number; position: Point; points: Point[]; path?: Point[]; rank: number; color: number }
export interface Crossing extends Point { a: number; b: number; over: number; under: number }
export interface Level {
  seed: string; difficulty: Difficulty; version: number; rats: Rat[]; crossings: Crossing[];
  fingerprint: string; metrics: { depth: number; available: number; crossings: number; minSeparation: number };
}
export const DIFFICULTIES: Record<Difficulty, { label: string; count: number; description: string }> = {
  cozy: { label: 'Уютно', count: 5, description: '5 крыс · небольшой клубок' },
  curious: { label: 'Любопытно', count: 8, description: '8 крыс · есть над чем подумать' },
  clever: { label: 'Хитро', count: 11, description: '11 крыс · запутанная история' },
};
const NAMES = ['Плюша', 'Шуршик', 'Булочка', 'Феня', 'Пончик', 'Кнопка', 'Пип', 'Соня', 'Крош', 'Тучка', 'Тиша', 'Жужа'];
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
export function randomSource(seed: string): () => number {
  let state = hash(seed);
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle<T>(values: T[], random: () => number): T[] {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
function radial(angle: number, radius: number): Point {
  return { x: 420 + Math.cos(angle) * radius, y: 420 + Math.sin(angle) * radius };
}

export function intersect(a: Point, b: Point, c: Point, d: Point): Point | null {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < 0.001) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denominator;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denominator;
  if (t <= 0.001 || t >= 0.999 || u <= 0.001 || u >= 0.999) return null;
  return { x: a.x + t * rx, y: a.y + t * ry };
}
export function blockers(level: Level, ratId: number, removed: ReadonlySet<number>): number[] {
  if (removed.has(ratId)) return [];
  return [...new Set(level.crossings.filter(c => c.under === ratId && !removed.has(c.over)).map(c => c.over))];
}
export function availableRats(level: Level, removed: ReadonlySet<number>): number[] {
  return level.rats.filter(r => !removed.has(r.id) && blockers(level, r.id, removed).length === 0).map(r => r.id);
}
export function solve(level: Level, alreadyRemoved: ReadonlySet<number> = new Set()): number[] | null {
  const removed = new Set(alreadyRemoved);
  const moves: number[] = [];
  while (removed.size < level.rats.length) {
    const available = availableRats(level, removed);
    if (!available.length) return null;
    for (const id of available) { removed.add(id); moves.push(id); }
  }
  return moves;
}
function depthOf(level: Level): number {
  const cache = new Map<number, number>();
  const visit = (id: number): number => {
    if (cache.has(id)) return cache.get(id)!;
    const dependencies = blockers(level, id, new Set());
    const depth = 1 + Math.max(0, ...dependencies.map(visit));
    cache.set(id, depth);
    return depth;
  };
  return Math.max(...level.rats.map(r => visit(r.id)));
}

function candidate(seed: string, difficulty: Difficulty, attempt: number, version: number): Level | null {
  const random = randomSource(`${version}/${seed}/${difficulty}/${attempt}`);
  const n = DIFFICULTIES[difficulty].count;
  const rotation = random() * Math.PI * 2;
  const ranks = shuffle(Array.from({ length: n }, (_, i) => i), random);
  const colors = shuffle(Array.from({ length: 12 }, (_, i) => i), random);
  const legacyRats: Rat[] = version === 1 ? Array.from({ length: n }, (_, id) => {
    const angle = rotation + id * Math.PI * 2 / n + (random() - 0.5) * 0.12;
    const radius = 306 + random() * 12;
    const direction = attempt % 2 === 0 ? 1 : -1;
    const bend = angle + (random() - 0.5) * 0.1;
    const turn = direction * (Math.PI * 2 / n) * (1.22 + random() * 0.83);
    return {
      id, name: NAMES[id], angle, position: radial(angle, radius), rank: ranks[id], color: colors[id],
      points: [radial(angle, radius - 29), radial(bend, 110 + random() * 68), radial(angle + turn, 202 + random() * 35)],
    };
  }) : [];
  const geometry = version === 1 ? null : version === 2 ? wovenRats(random, n) : curvedRats(random, n);
  if (version !== 1 && !geometry) return null;
  const rats: Rat[] = version === 1 ? legacyRats : geometry!.map((shape, id) => ({
    ...shape, id, name: NAMES[id], rank: ranks[id], color: colors[id],
  }));
  const crossings: Crossing[] = [];
  if (version >= 3) {
    const analysed = analysePaths(rats.map(tailPath));
    if (analysed.selfIntersection || analysed.shallowCrossing) return null;
    for (const point of analysed.crossings) crossings.push({ ...point, over: rats[point.a].rank > rats[point.b].rank ? point.a : point.b, under: rats[point.a].rank > rats[point.b].rank ? point.b : point.a });
  } else for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = rats[i], b = rats[j];
    for (let ai = 1; ai < a.points.length; ai++) for (let bi = 1; bi < b.points.length; bi++) {
      const point = intersect(a.points[ai - 1], a.points[ai], b.points[bi - 1], b.points[bi]);
      if (point) crossings.push({ ...point, a: i, b: j, over: a.rank > b.rank ? i : j, under: a.rank > b.rank ? j : i });
    }
  }
  // Geometry is normalized for translation, rotation and reflection before fingerprinting.
  const normalizationRotation = version === 1 ? rotation : rats[0].angle;
  const normalized = [1, -1].map(mirror => rats.map(r => r.points.map(p => {
    const x = p.x - 420, y = p.y - 420;
    return [Math.round((x * Math.cos(normalizationRotation) + y * Math.sin(normalizationRotation)) * 10), Math.round((-x * Math.sin(normalizationRotation) + y * Math.cos(normalizationRotation)) * mirror * 10)];
  })).map(points => JSON.stringify(points)).join('|')).sort()[0];
  const structure = crossings.map(c => `${c.over}>${c.under}`).sort().join(',');
  const level: Level = {
    version, seed, difficulty, rats, crossings,
    fingerprint: `${hash(normalized + '/' + structure).toString(16)}-${hash(structure + normalized).toString(16)}`,
    metrics: { depth: 0, available: 0, crossings: crossings.length, minSeparation: 999 },
  };
  level.metrics.depth = depthOf(level);
  level.metrics.available = availableRats(level, new Set()).length;
  for (let i = 0; i < crossings.length; i++) {
    const crossing = crossings[i];
    for (let j = i + 1; j < crossings.length; j++) level.metrics.minSeparation = Math.min(level.metrics.minSeparation, distance(crossing, crossings[j]));
    for (const id of [crossing.a, crossing.b]) for (const p of (version >= 3 ? [tailPath(rats[id])[0], tailPath(rats[id]).at(-1)!] : rats[id].points)) {
      level.metrics.minSeparation = Math.min(level.metrics.minSeparation, distance(crossing, p));
    }
  }
  return level;
}

export function validateLevel(level: Level): string[] {
  const problems: string[] = [];
  if (solve(level)?.length !== level.rats.length) problems.push('unsolvable');
  if (!level.crossings.length) problems.push('no-crossings');
  for (const rat of level.rats) {
    if (level.version >= 2 && (rat.points.length < 7 || rat.points.length > 8)) problems.push(`bend-count:${rat.id}`);
    if (!level.crossings.some(c => c.a === rat.id || c.b === rat.id)) problems.push(`isolated:${rat.id}`);
    if (tailPath(rat).some(p => p.x < 50 || p.x > 790 || p.y < 50 || p.y > 790)) problems.push(`outside:${rat.id}`);
  }
  for (const crossing of level.crossings) {
    if (level.rats[crossing.over].rank <= level.rats[crossing.under].rank) problems.push('invalid-order');
  }
  if (level.metrics.minSeparation < 16) problems.push('crowded-crossings');
  return problems;
}

/** Never repairs a blocked puzzle by silently deleting a rat: reject the candidate instead. */
export function generateLevel(seed: string, difficulty: Difficulty = 'curious', version = GENERATOR_VERSION): Level {
  if (![1, 2, 3].includes(version)) throw new Error(`Неизвестная версия клубка: ${version}`);
  seed = seed.toLowerCase();
  let best: Level | undefined;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 1200; attempt++) {
    const level = candidate(seed, difficulty, attempt, version);
    if (!level) continue;
    if (validateLevel(level).length) continue;
    const n = level.rats.length;
    const targetCrossings = version === 1 ? (difficulty === 'cozy' ? 5 : difficulty === 'curious' ? 12 : 20) : n * 3;
    const targetDepth = Math.ceil(n * (version === 1 ? 0.6 : 0.8));
    const score = Math.abs(level.crossings.length - targetCrossings) + Math.abs(level.metrics.depth - targetDepth) * 2 + Math.abs(level.metrics.available - 2) * 2;
    if (score < bestScore) { best = level; bestScore = score; }
    if (score <= 2) return level;
    if (attempt > (version >= 3 ? 24 : 120) && best) break;
  }
  if (!best) throw new Error(`Не удалось создать читаемый клубок: ${seed}/${difficulty}`);
  return best;
}

export function levelCode(seed: string, difficulty: Difficulty, version = GENERATOR_VERSION): string {
  return `RK${version}-${difficulty === 'cozy' ? 'U' : difficulty === 'curious' ? 'L' : 'H'}-${seed}`;
}
export function parseCode(code: string): { seed: string; difficulty: Difficulty; version: number } | null {
  const match = /^RK([123])-([ULH])-([A-Za-z0-9_-]{1,48})$/i.exec(code.trim());
  if (!match) return null;
  return { difficulty: ({ U: 'cozy', L: 'curious', H: 'clever' } as const)[match[2].toUpperCase() as 'U' | 'L' | 'H'], seed: match[3].toLowerCase(), version: Number(match[1]) };
}
