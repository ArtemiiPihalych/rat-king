import Phaser from 'phaser';
import { type Level, type Point, blockers, availableRats, BOARD_SIZE } from './generator';
import { PALETTES, createRatTextures } from './rat-art';
import { tailPath } from './tail-geometry';

export interface SceneCallbacks {
  onRelease: (id: number) => void;
  onBlocked: (id: number, blocker: number) => void;
  onInspect: (id: number | null) => void;
  reducedMotion: () => boolean;
}
export class RatScene extends Phaser.Scene {
  private level?: Level;
  private removed = new Set<number>();
  private ratImages = new Map<number, Phaser.GameObjects.Image>();
  private tails!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private hover: number | null = null;
  private hinted: number | null = null;
  private busy = false;
  private hold?: Phaser.Time.TimerEvent;
  private held = false;
  private epoch = 0;
  private pending?: { level: Level; removed: Set<number> };
  public ready = false;
  public callbacks!: SceneCallbacks;

  constructor() { super('rats'); }
  create(): void {
    createRatTextures(this);
    const backdrop = this.add.graphics();
    backdrop.lineStyle(1.2, 0xd6c8ad, 0.48);
    backdrop.strokeCircle(420, 420, 371);
    for (let i = 0; i < 48; i++) {
      const a = i * Math.PI / 24;
      const r = i % 4 === 0 ? 365 : 369;
      backdrop.lineBetween(420 + Math.cos(a) * r, 420 + Math.sin(a) * r, 420 + Math.cos(a) * 374, 420 + Math.sin(a) * 374);
    }
    this.tails = this.add.graphics().setDepth(2);
    this.effects = this.add.graphics().setDepth(30);
    this.input.on('gameout', () => { this.clearHold(); this.hover = null; this.callbacks?.onInspect(null); this.draw(); });
    this.ready = true;
    if (this.pending) { const p = this.pending; this.pending = undefined; this.loadLevel(p.level, p.removed); }
  }
  loadLevel(level: Level, removed: Set<number>): void {
    if (!this.ready) { this.pending = { level, removed: new Set(removed) }; return; }
    this.epoch++;
    this.tweens.killAll(); this.clearHold();
    this.ratImages.forEach(r => r.destroy());
    this.ratImages.clear(); this.effects.clear();
    this.level = level; this.removed = new Set(removed); this.busy = false; this.hover = null; this.hinted = null;
    level.rats.forEach(rat => {
      if (removed.has(rat.id)) return;
      const image = this.add.image(rat.position.x, rat.position.y, `rat-${rat.color}`).setDisplaySize(104, 122).setRotation(rat.angle + Math.PI / 2).setDepth(20);
      image.setInteractive(new Phaser.Geom.Circle(96, 112, 99), Phaser.Geom.Circle.Contains);
      image.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (this.busy || pointer.wasTouch) return;
        this.hover = rat.id; this.draw();
      });
      image.on('pointerout', () => { this.clearHold(); this.hover = null; this.draw(); this.callbacks.onInspect(null); });
      image.on('pointerdown', () => {
        if (this.busy) return;
        this.held = false;
        this.hold = this.time.delayedCall(350, () => { this.held = true; this.hover = rat.id; this.draw(); this.callbacks.onInspect(rat.id); });
      });
      image.on('pointerup', () => {
        this.clearHold();
        if (this.held) { this.held = false; this.hover = null; this.draw(); this.callbacks.onInspect(null); }
        else this.attempt(rat.id);
      });
      this.ratImages.set(rat.id, image);
    });
    this.draw();
  }
  private clearHold(): void { this.hold?.remove(); this.hold = undefined; }
  private path(points: Point[], width: number, color: number, alpha = 1, sampled = false): void {
    const rounded: Point[] = sampled ? points : [points[0]];
    for (let i = 1; !sampled && i < points.length - 1; i++) {
      const a = points[i - 1], corner = points[i], b = points[i + 1];
      const la = Math.hypot(corner.x - a.x, corner.y - a.y), lb = Math.hypot(b.x - corner.x, b.y - corner.y);
      if (la < 0.001 || lb < 0.001) { rounded.push(corner); continue; }
      // Curves stay within 12px of the vertex; validated intersections are at least 16px away.
      const trim = Math.min(12, la / 3, lb / 3);
      const start = { x: corner.x + (a.x - corner.x) * trim / la, y: corner.y + (a.y - corner.y) * trim / la };
      const end = { x: corner.x + (b.x - corner.x) * trim / lb, y: corner.y + (b.y - corner.y) * trim / lb };
      rounded.push(start);
      for (let j = 1; j <= 8; j++) {
        const t = j / 8, u = 1 - t;
        rounded.push({ x: u * u * start.x + 2 * u * t * corner.x + t * t * end.x, y: u * u * start.y + 2 * u * t * corner.y + t * t * end.y });
      }
    }
    if (!sampled) rounded.push(points[points.length - 1]);
    this.tails.lineStyle(width, color, alpha);
    this.tails.beginPath(); this.tails.moveTo(rounded[0].x, rounded[0].y);
    for (const point of rounded.slice(1)) this.tails.lineTo(point.x, point.y);
    this.tails.strokePath();
    this.tails.fillStyle(color, alpha);
    (sampled ? [rounded[0], rounded[rounded.length - 1]] : rounded).forEach(point => this.tails.fillCircle(point.x, point.y, width / 2));
  }
  private tail(id: number, alpha: number, pointsOverride?: Point[]): void {
    const rat = this.level!.rats[id], points = pointsOverride ?? tailPath(rat);
    if (points.length < 2) return;
    const color = PALETTES[rat.color].tail;
    const sampled = !!rat.path;
    this.path(points, sampled ? 18 : 16, 0xf8f1e0, alpha, sampled);
    this.path(points, sampled ? 12 : 11.5, 0x685646, alpha * (sampled ? 0.26 : 0.85), sampled);
    this.path(points, sampled ? 10 : 8, color, alpha, sampled);
    // Small transverse rings make each tail easier to trace without relying on color alone.
    this.tails.lineStyle(1.15, 0x534634, alpha * 0.28);
    let nextRing = 17;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const length = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
      if (length < 0.001) continue;
      for (let d = sampled ? nextRing : 17; d < length - (sampled ? 0 : 10); d += 25) {
        const x = a.x + (b.x - a.x) * d / length, y = a.y + (b.y - a.y) * d / length;
        this.tails.lineBetween(x - nx * 2.7, y - ny * 2.7, x + nx * 2.7, y + ny * 2.7);
      }
      if (sampled) { nextRing -= length; while (nextRing < 0) nextRing += 25; }
    }
  }
  private draw(animatedId?: number, progress = 0): void {
    if (!this.level || !this.ready) return;
    this.tails.clear();
    const focus = this.hover ?? this.hinted;
    [...this.level.rats].sort((a, b) => a.rank - b.rank).forEach(rat => {
      if (this.removed.has(rat.id)) return;
      const alpha = focus !== null && focus !== rat.id ? 0.3 : 1;
      if (animatedId === rat.id) {
        const image = this.ratImages.get(rat.id)!;
        const dx = image.x - rat.position.x, dy = image.y - rat.position.y;
        const basePath = tailPath(rat);
        const root = { x: basePath[0].x + dx, y: basePath[0].y + dy };
        // A controlled extraction curve collapses the free tip toward the departing rat.
        const points = basePath.map((p, i) => i === 0 ? root : ({ x: p.x + dx + (root.x - p.x - dx) * progress, y: p.y + dy + (root.y - p.y - dy) * progress }));
        this.tail(rat.id, 1 - progress * 0.65, points);
      } else this.tail(rat.id, alpha);
    });
    this.ratImages.forEach((image, id) => image.setAlpha(focus !== null && focus !== id ? 0.65 : 1));
    this.effects.clear();
    if (this.hinted !== null && !this.removed.has(this.hinted)) {
      const rat = this.level.rats[this.hinted];
      this.effects.lineStyle(3, 0x78916a, 0.9).strokeCircle(rat.position.x, rat.position.y, 53);
      this.effects.lineStyle(1, 0x78916a, 0.4).strokeCircle(rat.position.x, rat.position.y, 59);
    }
  }
  attempt(id: number): void {
    if (!this.level || this.busy || this.removed.has(id)) return;
    this.hinted = null; this.hover = null;
    const dependencies = blockers(this.level, id, this.removed);
    if (dependencies.length) {
      const first = dependencies[0]; this.callbacks.onBlocked(id, first);
      const image = this.ratImages.get(id)!;
      if (!this.callbacks.reducedMotion()) this.tweens.add({ targets: image, angle: image.angle + 7, duration: 85, yoyo: true, repeat: 1 });
      this.draw();
      const cross = this.level.crossings.find(c => c.under === id && c.over === first)!;
      this.effects.lineStyle(4, 0xb77458, 1).strokeCircle(cross.x, cross.y, 19);
      const epoch = this.epoch;
      this.time.delayedCall(1300, () => { if (epoch === this.epoch) this.draw(); });
      return;
    }
    this.busy = true; this.effects.clear();
    const rat = this.level.rats[id], image = this.ratImages.get(id)!;
    const epoch = this.epoch, state = { t: 0 };
    this.tweens.add({
      targets: state, t: 1, duration: this.callbacks.reducedMotion() ? 90 : 680, ease: 'Cubic.easeIn',
      onUpdate: () => {
        if (epoch !== this.epoch) return;
        image.x = rat.position.x + Math.cos(rat.angle) * 210 * state.t;
        image.y = rat.position.y + Math.sin(rat.angle) * 210 * state.t;
        this.draw(id, state.t);
      },
      onComplete: () => {
        if (epoch !== this.epoch) return;
        this.removed.add(id); image.destroy(); this.ratImages.delete(id);
        this.busy = false; this.draw(); this.callbacks.onRelease(id);
      },
    });
  }
  showHint(): number | undefined {
    if (!this.level || this.busy) return;
    const available = availableRats(this.level, this.removed);
    const next = available[0];
    if (next !== undefined) { this.hinted = next; this.hover = null; this.draw(); }
    return next;
  }
  isBusy(): boolean { return this.busy; }
}

export function makeGame(scene: RatScene, parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO, parent, width: BOARD_SIZE, height: BOARD_SIZE, transparent: true,
    antialias: true, scene: [scene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, expandParent: false },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 1 },
    audio: { noAudio: true },
  });
}
