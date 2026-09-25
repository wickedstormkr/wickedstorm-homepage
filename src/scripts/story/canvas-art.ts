/**
 * 데이터 아트 캔버스 층(입자 약 2,400개, 2D). 성능이 낮은 PC·태블릿용. WebGL 층과 같은 배치(place)를 그린다.
 * 그리는 때: 스크롤로 장면 값이 바뀔 때 한 번, 떠다님이 켜져 있고 무대가 보일 때만 rAF(움직임 멈춤이면 멈춤).
 */
import { buildParticles, place, VERBS, VERB_COLOR, type Particle } from '../../lib/story-data';
import type { Art, ArtBox } from './art-types';

export class CanvasArt implements Art {
  private ctx: CanvasRenderingContext2D;
  private ps: Particle[];
  private sprites: HTMLCanvasElement[];
  private box: ArtBox = { x: 0, y: 0, w: 1, h: 1 };
  private shift: [number, number] = [0, 0];
  private s = 0;
  private dpr = Math.min(1.5, devicePixelRatio || 1);
  private ambient = false;
  private raf = 0;
  private tmp = new Float32Array(4);

  constructor(private canvas: HTMLCanvasElement, count = 2400) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d');
    this.ctx = ctx;
    this.ps = buildParticles(count, 7);
    // 활동 종류별 빛 점(가운데 흰빛 + 색 번짐) 한 장씩 미리 그려 둔다
    this.sprites = VERBS.map((v) => {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const g = c.getContext('2d')!;
      const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.18, VERB_COLOR[v]);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 32, 32);
      return c;
    });
  }

  resize(w: number, h: number, box: ArtBox, shift: [number, number] = [0, 0]) {
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.box = box;
    this.shift = shift;
    this.draw(performance.now());
  }

  setScene(s: number) {
    this.s = s;
    if (!this.raf) this.draw(performance.now());
  }

  setAmbient(on: boolean) {
    this.ambient = on;
    if (on && !this.raf) {
      const loop = (t: number) => {
        if (!this.ambient) { this.raf = 0; return; }
        this.draw(t);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
  }

  private draw(time: number) {
    const { ctx, box, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.s < 1.2) return; // 장면 1·2에는 입자가 아직 없다
    ctx.globalCompositeOperation = 'lighter';
    const base = Math.max(5, box.w * 0.0095) * dpr;
    const amb = this.ambient ? 0.0022 : 0;
    const t = time / 1000;
    for (const p of this.ps) {
      const o = place(p, this.s, this.tmp, this.shift);
      if (o[2] < 0.02) continue;
      const x = (box.x + (o[0] + Math.sin(t * 0.7 + p.phase) * amb) * box.w) * dpr;
      const y = (box.y + (o[1] + Math.cos(t * 0.6 + p.phase) * amb * 1.6) * box.h) * dpr;
      const sz = base * o[3];
      ctx.globalAlpha = o[2];
      ctx.drawImage(this.sprites[p.verb], x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  destroy() {
    this.ambient = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
