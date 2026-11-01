import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel, validateLevel, solve, availableRats, blockers, intersect, parseCode, levelCode, type Difficulty } from '../src/generator.ts';
import { readSave, writeSave } from '../src/storage.ts';

test('1,000 generated levels: geometry is readable, every rat participates, and every level is solvable', () => {
  const fingerprints = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const difficulty: Difficulty = ['cozy', 'curious', 'clever'][i % 3] as Difficulty;
    const level = generateLevel(`audit-${i}`, difficulty);
    assert.deepEqual(validateLevel(level), [], `invalid level ${i}`);
    assert.equal(fingerprints.has(level.fingerprint), false, `duplicate level ${i}`);
    fingerprints.add(level.fingerprint);
    assert.equal(solve(level)?.length, level.rats.length);
    for (const rat of level.rats) {
      const bends = rat.points.length - 2;
      assert.ok(bends >= 5 && bends <= 6, `rat ${rat.id} in ${i} needs 5–6 genuine turns`);
      for (let j = 1; j < rat.points.length - 1; j++) {
        const a = rat.points[j - 1], b = rat.points[j], c = rat.points[j + 1];
        const dot = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y);
        assert.ok(Math.abs(dot) < 0.001, `turn ${j} is a real 90-degree bend`);
      }
      for (let a = 1; a < rat.points.length; a++) for (let b = a + 2; b < rat.points.length; b++) {
        assert.equal(intersect(rat.points[a - 1], rat.points[a], rat.points[b - 1], rat.points[b]), null, 'a tail cannot cross itself');
      }
    }
    // At each state, take a randomly selected legal move, rather than the generator's preferred order.
    const removed = new Set<number>();
    while (removed.size < level.rats.length) {
      const available = availableRats(level, removed);
      assert.ok(available.length > 0, `dead end ${i}`);
      const id = available[(i + removed.size * 7) % available.length];
      assert.equal(blockers(level, id, removed).length, 0);
      removed.add(id);
    }
    // Every drawn segment intersection must exist in the game's blocking model.
    for (let a = 0; a < level.rats.length; a++) for (let b = a + 1; b < level.rats.length; b++) {
      const pa = level.rats[a].points, pb = level.rats[b].points;
      for (let ai = 1; ai < pa.length; ai++) for (let bi = 1; bi < pb.length; bi++) {
        const hit = intersect(pa[ai - 1], pa[ai], pb[bi - 1], pb[bi]);
        if (hit) assert.ok(level.crossings.some(c => c.a === a && c.b === b && Math.hypot(c.x - hit.x, c.y - hit.y) < 0.01));
      }
    }
  }
});

test('same version, seed and difficulty reproduce identical geometry and solution', () => {
  for (const difficulty of ['cozy', 'curious', 'clever'] as const) {
    assert.deepEqual(generateLevel('shared-level', difficulty), generateLevel('shared-level', difficulty));
  }
});

test('closed dependency cycles are detected; blocked rats never become legal early', () => {
  const level = generateLevel('logic-case', 'curious');
  const removed = new Set<number>();
  const blocked = level.rats.find(r => blockers(level, r.id, removed).length > 0)!;
  assert.ok(blocked);
  const dependencies = blockers(level, blocked.id, removed);
  dependencies.forEach(id => removed.add(id));
  assert.equal(blockers(level, blocked.id, removed).length, 0);
  const broken = structuredClone(level);
  broken.crossings = [
    { x: 0, y: 0, a: 0, b: 1, over: 0, under: 1 },
    { x: 0, y: 0, a: 0, b: 1, over: 1, under: 0 },
  ];
  assert.equal(solve(broken), null);
});

test('share codes preserve seed and difficulty and reject incompatible versions', () => {
  assert.deepEqual(parseCode(levelCode('daily-20261101', 'clever')), { seed: 'daily-20261101', difficulty: 'clever', version: 2 });
  assert.equal(parseCode('RK99-H-example'), null);
  assert.equal(parseCode('<script>'), null);
  assert.deepEqual(parseCode('rk1-u-ATTIC-1'), { seed: 'attic-1', difficulty: 'cozy', version: 1 });
  assert.deepEqual(generateLevel('ATTIC-1', 'cozy'), generateLevel('attic-1', 'cozy'));
});

test('legacy RK1 levels keep their simpler geometry and remain playable', () => {
  const legacy = generateLevel('attic-1', 'cozy', 1);
  assert.equal(legacy.version, 1);
  assert.ok(legacy.rats.every(r => r.points.length === 3));
  assert.deepEqual(validateLevel(legacy), []);
  assert.equal(solve(legacy)?.length, 5);
  assert.equal(levelCode(legacy.seed, legacy.difficulty, legacy.version), 'RK1-U-attic-1');
  assert.notEqual(legacy.fingerprint, generateLevel('attic-1', 'cozy').fingerprint);
});

test('migration keeps completed statistics and an untouched legacy backup; explicit old codes still persist', () => {
  const legacy = JSON.stringify({ schema: 1, difficulty: 'cozy', seed: 'attic-1', number: 3, removed: [1], solved: 4, rescued: 20, completed: ['RK1-U-old'], fingerprints: [], sound: true, started: true });
  const memory = new Map<string, string>([['rat-king-save-v1', legacy]]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  } });
  try {
    const migrated = readSave();
    assert.equal(migrated.generationVersion, 2);
    assert.equal(migrated.solved, 4);
    assert.equal(migrated.rescued, 20);
    assert.deepEqual(migrated.removed, []);
    assert.equal(writeSave(migrated), true);
    assert.equal(memory.get('rat-king-save-v1'), legacy);
    migrated.generationVersion = 1;
    migrated.removed = [1];
    writeSave(migrated);
    assert.equal(readSave().generationVersion, 1);
    assert.deepEqual(readSave().removed, [1]);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete (globalThis as Record<string, unknown>).localStorage;
  }
});
