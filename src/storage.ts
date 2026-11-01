import { GENERATOR_VERSION, type Difficulty } from './generator';

export interface Save {
  schema: 2; generationVersion: number; difficulty: Difficulty; seed: string; number: number; removed: number[];
  solved: number; rescued: number; completed: string[]; fingerprints: string[];
  sound: boolean; reducedMotion: boolean; started: boolean;
}
const KEY = 'rat-king-save-v2';
export function defaultSave(): Save {
  return {
    schema: 2, generationVersion: GENERATOR_VERSION, difficulty: 'cozy', seed: 'attic-1', number: 1, removed: [], solved: 0, rescued: 0,
    completed: [], fingerprints: [], sound: false,
    reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    started: false,
  };
}
export function readSave(): Save {
  const defaults = defaultSave();
  try {
    // Keep the v1 save intact as a backup. Old completed statistics carry over; old moves do not
    // apply to a differently woven current puzzle. Explicit RK1 codes still open the old geometry.
    const raw = JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem('rat-king-save-v1') ?? 'null');
    if (!raw || (raw.schema !== 1 && raw.schema !== 2)) return defaults;
    return {
      ...defaults,
      generationVersion: raw.schema === 2 && raw.generationVersion === 1 ? 1 : GENERATOR_VERSION,
      difficulty: ['cozy', 'curious', 'clever'].includes(raw.difficulty) ? raw.difficulty : defaults.difficulty,
      seed: typeof raw.seed === 'string' && /^[a-zA-Z0-9_-]{1,48}$/.test(raw.seed) ? raw.seed : defaults.seed,
      number: Number.isInteger(raw.number) && raw.number > 0 ? Math.min(raw.number, 1000000) : 1,
      removed: raw.schema === 2 && Array.isArray(raw.removed) ? [...new Set(raw.removed.filter((v: unknown) => Number.isInteger(v) && Number(v) >= 0 && Number(v) < 12))] as number[] : [],
      solved: Number.isInteger(raw.solved) && raw.solved >= 0 ? raw.solved : 0,
      rescued: Number.isInteger(raw.rescued) && raw.rescued >= 0 ? raw.rescued : 0,
      completed: Array.isArray(raw.completed) ? raw.completed.filter((v: unknown) => typeof v === 'string').slice(-500) : [],
      fingerprints: Array.isArray(raw.fingerprints) ? raw.fingerprints.filter((v: unknown) => typeof v === 'string').slice(-2000) : [],
      sound: raw.sound === true, reducedMotion: raw.reducedMotion === true, started: raw.started === true,
    };
  } catch { return defaults; }
}
export function writeSave(save: Save): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(save)); return true; } catch { return false; }
}
