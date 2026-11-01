import Phaser from 'phaser';

export const PALETTES = [
  { body: '#aaa894', light: '#d2d0ba', tail: 0x8b9c79 },
  { body: '#cc9b73', light: '#efd1a7', tail: 0xc58d64 },
  { body: '#929eac', light: '#c1cbd6', tail: 0x758fae },
  { body: '#b69db3', light: '#ddc7d9', tail: 0xaa80a3 },
  { body: '#ccaaa0', light: '#efd2c6', tail: 0xc17770 },
  { body: '#bcae7a', light: '#e4d7a6', tail: 0xaa984b },
  { body: '#8caaa5', light: '#bfd7cc', tail: 0x5b9990 },
  { body: '#a0988c', light: '#d1c7b9', tail: 0x937869 },
  { body: '#a49dbd', light: '#d1cce5', tail: 0x887ab4 },
  { body: '#bf967b', light: '#e4c5a7', tail: 0xb4704c },
  { body: '#b0b47c', light: '#d8dfb0', tail: 0x859345 },
  { body: '#bd969f', light: '#e5c4cc', tail: 0xad6787 },
];

/** Original top-down rat art, drawn at 2x resolution; no third-party character assets. */
export function createRatTextures(scene: Phaser.Scene): void {
  PALETTES.forEach((palette, index) => {
    if (scene.textures.exists(`rat-${index}`)) return;
    const texture = scene.textures.createCanvas(`rat-${index}`, 192, 224)!;
    const ctx = texture.context;
    ctx.scale(2, 2);
    ctx.translate(48, 57);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, outline = true) => {
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
      if (outline) { ctx.strokeStyle = '#584b40'; ctx.lineWidth = 1.7; ctx.stroke(); }
    };
    ellipse(1, 11, 31, 34, '#4e44331b', false);
    ellipse(-23, 16, 7, 5, '#d6aaa2'); ellipse(23, 16, 7, 5, '#d6aaa2');
    const body = ctx.createLinearGradient(-28, 0, 27, 0);
    body.addColorStop(0, palette.body); body.addColorStop(0.5, palette.light); body.addColorStop(1, palette.body);
    ctx.beginPath(); ctx.moveTo(-16, -25); ctx.bezierCurveTo(-36, -13, -34, 28, -15, 36);
    ctx.bezierCurveTo(-4, 43, 18, 39, 25, 25); ctx.bezierCurveTo(36, 7, 28, -20, 16, -25); ctx.closePath();
    ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 2.1; ctx.strokeStyle = '#584b40'; ctx.stroke();
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-19, -3); ctx.quadraticCurveTo(-23, 15, -13, 26); ctx.stroke();
    ellipse(-20, -24, 13, 14, palette.body); ellipse(20, -24, 13, 14, palette.body);
    ellipse(-20, -24, 8.2, 9.3, '#d6aaa2', false); ellipse(20, -24, 8.2, 9.3, '#d6aaa2', false);
    ctx.beginPath(); ctx.moveTo(-19, -22); ctx.bezierCurveTo(-22, -38, -12, -43, -6, -48);
    ctx.quadraticCurveTo(0, -54, 6, -48); ctx.bezierCurveTo(12, -43, 22, -38, 19, -22);
    ctx.quadraticCurveTo(0, -8, -19, -22); ctx.fillStyle = palette.light; ctx.fill(); ctx.strokeStyle = '#584b40'; ctx.lineWidth = 1.8; ctx.stroke();
    ellipse(-10, -33, 3.1, 4, '#3d3833', false); ellipse(10, -33, 3.1, 4, '#3d3833', false);
    ellipse(-10.7, -34.3, 1.1, 1.2, '#fff8e9', false); ellipse(9.3, -34.3, 1.1, 1.2, '#fff8e9', false);
    ellipse(-14, -26, 4.2, 2.6, '#dba09a66', false); ellipse(14, -26, 4.2, 2.6, '#dba09a66', false);
    ellipse(0, -47, 4, 2.7, '#bf807d');
    ctx.lineWidth = 1; ctx.strokeStyle = '#75685d';
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(side * 9, -40 + i * 2.8); ctx.lineTo(side * 28, -44 + i * 6); ctx.stroke();
    }
    if (index % 3 === 0) {
      ctx.beginPath(); ctx.moveTo(-13, -12); ctx.quadraticCurveTo(0, -7, 13, -12); ctx.strokeStyle = '#7c9670'; ctx.lineWidth = 5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, -11); ctx.lineTo(17, -2); ctx.lineTo(8, -4); ctx.fillStyle = '#7c9670'; ctx.fill();
    }
    texture.refresh();
  });
}
