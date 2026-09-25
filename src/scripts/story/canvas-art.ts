/**
 * 데이터 아트 캔버스 층(입자 약 2,400개, 2D). 성능이 낮은 PC·태블릿용. WebGL 층과 같은 배치(place)를 그린다.
 * 움직이는 동안에는 지난 그림을 조금씩 지워 빛 꼬리를 남긴다(움직임 멈춤이면 꼬리 없이 한 장만).
 */
import { buildParticles, place, VERBS, VERB_COLOR, type Particle, type PlaceEnv, type StageMap } from '../../lib/story-data';
import type { Art, ArtBox, ArtAnchors } from './art-types';

export class CanvasArt implements Art {
  private ctx: CanvasRenderingContext2D;
  private ps: Particle[];
  private sprites: HTMLCanvasElement[];
  private box: ArtBox = { x: 0, y: 0, w: 1, h: 1 };
  private env: PlaceEnv = {};
  private s = 0;
  private dpr = Math.min(1.5, devicePixelRatio || 1);
  private ambient = false;
  private raf = 0;
  private t0 = performance.now();
  private clock = 0;
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

  resize(w: number, h: number, box: ArtBox, a: ArtAnchors = {}) {
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.box = box;
    const stage: StageMap = { x0: -box.x / box.w, y0: -box.y / box.h, sx: w / box.w, sy: h / box.h, ar: w / h };
    this.env = { ...this.env, stage, shift: a.shift, heroG: a.heroG, heroF: a.heroF };
    this.draw(true);
  }

  setScene(s: number) {
    this.s = s;
    if (!this.raf) this.draw(true);
  }

  setAmbient(on: boolean) {
    this.ambient = on;
    if (on && !this.raf) {
      this.t0 = performance.now() - this.clock * 1000;
      const loop = () => {
        if (!this.ambient) { this.raf = 0; return; }
        this.clock = (performance.now() - this.t0) / 1000;
        this.draw(false);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    } else if (!on) this.draw(true);
  }

  private draw(clear: boolean) {
    const { ctx, box, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (clear || !this.ambient) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    else {
      // 빛 꼬리: 지난 그림을 조금만 지운다
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.globalCompositeOperation = 'lighter';
    const base = Math.max(5, box.w * 0.0095) * dpr;
    const t = this.clock;
    this.env.time = t;
    for (const p of this.ps) {
      const o = place(p, this.s, this.tmp, this.env);
      if (o[2] < 0.02) continue;
      const x = (box.x + o[0] * box.w) * dpr;
      const y = (box.y + o[1] * box.h) * dpr;
      const tw = this.ambient && this.s < 1 && !p.hero ? 0.7 + 0.3 * Math.sin(t * 1.3 + p.phase * 3) : 1;
      const pulse = p.hero && this.s < 1.6 ? 1 + 0.25 * Math.sin(t * 2.4) : 1;
      const sz = base * o[3] * pulse;
      ctx.globalAlpha = Math.min(1, o[2] * tw);
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
