/**
 * 데이터 아트 주 층(캔버스 2D, 입자 = 오늘 수집 1,374건).
 * 별 하나하나를 광원처럼: 흰 코어 + 색 번짐 스프라이트를 가까움(z)에 따라 세 급(작은 점·빛나는 점·보케)으로 나눠
 * 'lighter' 합성으로 겹쳐 그린다(지금 사이트 히어로와 같은 방식). 옮겨 가는 동안에는 지나온 길을 가늘어지는 꼬리로.
 * 장면 1: 성운 + 가까운 별끼리 옅은 선 + 실시간 수집 패널에서 날아드는 새 기록(emit)
 * 장면 2: 기록 행(actor·verb·object 세 칸)에 입자가 착지하며 칸이 왼쪽부터 채워진다
 * 장면 3~6: 체계 → 막대 → 근거 → 고리(story-data.ts place)
 */
import { buildParticles, place, progress, VERBS, VERB_COLOR, SLOT_COLOR, LEDGER, type Particle, type PlaceEnv, type BoxMap } from '../../lib/story-data';
import type { Art, ArtBox, ArtAnchors } from './art-types';

type Rect = { x: number; y: number; w: number; h: number };
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const hexRgb = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));

interface Sprites { s: HTMLCanvasElement; m: HTMLCanvasElement; l: HTMLCanvasElement }
interface Comet { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number; t0: number; c: number }
/** 실시간 수집에서 날아와 성운에 자리 잡은 새 별(무대 기준 0~1) */
interface Landed { x: number; y: number; c: number; t0: number; d: number }

export class CanvasArt implements Art {
  private ctx: CanvasRenderingContext2D;
  private ps: Particle[];
  private spr: Sprites[];
  private cols: number[][];
  private box: ArtBox = { x: 0, y: 0, w: 1, h: 1 };
  private W = 1;
  private H = 1;
  private ledger: Rect | null = null;
  private env: PlaceEnv = {};
  private edges: [number, number, number][] = [];
  private comets: Comet[] = [];
  private landed: Landed[] = [];
  private s = 0;
  private dpr = Math.min(1.5, devicePixelRatio || 1);
  private ambient = false;
  private raf = 0;
  private t0 = performance.now();
  private clock = 0;
  private o = [0, 0, 0, 0, 0];
  private o2 = [0, 0, 0, 0, 0];

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d');
    this.ctx = ctx;
    this.ps = buildParticles();
    // 색: 0~3 활동 종류(시청·응답·제출·질문), 기록 칸 색(actor·verb·object)은 앞의 셋과 같다
    this.cols = VERBS.map((v) => hexRgb(VERB_COLOR[v]));
    this.spr = this.cols.map((c) => ({ s: sprite(c, 16, 0.9, 0.78), m: sprite(c, 36, 0.85, 0.62), l: bokeh(c, 72) }));
    void SLOT_COLOR;
  }

  resize(w: number, h: number, box: ArtBox, a: ArtAnchors = {}) {
    this.W = w;
    this.H = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.box = box;
    this.ledger = a.ledger ?? null;
    const stage: BoxMap = { x0: -box.x / box.w, y0: -box.y / box.h, sx: w / box.w, sy: h / box.h };
    const L = this.ledger;
    const ledger: BoxMap | undefined = L ? { x0: (L.x - box.x) / box.w, y0: (L.y - box.y) / box.h, sx: L.w / box.w, sy: L.h / box.h } : undefined;
    this.env = { ...this.env, stage, ledger, shift: a.shift };
    // 성운의 옅은 선: 가까운(밝은) 별끼리 150px 안쪽 쌍 중 강한 130개만(다 이으면 거미줄이 된다)
    const bright = this.ps.map((p, i) => i).filter((i) => this.ps[i].z >= 0.55);
    const e: [number, number, number][] = [];
    for (let i = 0; i < bright.length; i++) {
      for (let j = i + 1; j < bright.length; j++) {
        const p = this.ps[bright[i]];
        const q = this.ps[bright[j]];
        const d = Math.hypot((p.G[0] - q.G[0]) * w, (p.G[1] - q.G[1]) * h);
        if (d < 150) e.push([bright[i], bright[j], 1 - d / 150]);
      }
    }
    this.edges = e.sort((x, y) => y[2] - x[2]).slice(0, 130);
    this.draw();
  }

  setScene(s: number) {
    this.s = s;
    if (!this.raf) this.draw();
  }

  setAmbient(on: boolean) {
    this.ambient = on;
    if (on && !this.raf) {
      this.t0 = performance.now() - this.clock * 1000;
      const loop = () => {
        if (!this.ambient) { this.raf = 0; return; }
        this.clock = (performance.now() - this.t0) / 1000;
        this.draw();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    } else if (!on) this.draw();
  }

  /**
   * 실시간 수집 패널에서 기록 한 줄이 위로 밀려 사라지면, 그 줄의 점(무대 px)이 별이 되어 성운으로 날아가 자리 잡는다.
   * 색은 그 기록의 활동 종류. 자리 잡은 별은 장면 1 동안 배경에 남는다(최대 160개).
   */
  emit(x: number, y: number, verb: number) {
    if (!this.ambient || this.s > 0.35) return;
    // 도착점: 패널을 피해 성운 쪽(무대 왼쪽 2/3, 글 아래·위 여백 포함)으로
    const x1 = (0.08 + Math.random() * 0.56) * this.W;
    const y1 = (0.1 + Math.random() * 0.8) * this.H;
    const dx = x1 - x;
    const dy = y1 - y;
    const k = (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.15);
    this.comets.push({ x0: x, y0: y, x1, y1, cx: (x + x1) / 2 - dy * k, cy: (y + y1) / 2 + dx * k, t0: this.clock, c: verb });
    if (this.comets.length > 12) this.comets.shift();
    this.landed.push({ x: x1 / this.W, y: y1 / this.H, c: verb, t0: this.clock + 1.4, d: 5 + Math.random() * 6 });
    if (this.landed.length > 160) this.landed.shift();
  }

  private draw() {
    const { ctx, box, dpr, s } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    this.env.time = this.clock;
    const base = Math.max(4.5, box.w * 0.0095);
    const px = (o: ArrayLike<number>) => [box.x + o[0] * box.w, box.y + o[1] * box.h];

    // 1) 성운의 옅은 선(구조가 생기기 전까지만)
    const la = 1 - clamp01(s / 0.55);
    if (la > 0.01) {
      ctx.lineWidth = 0.6;
      for (const [i, j, k] of this.edges) {
        const a = px(place(this.ps[i], s, this.o, this.env));
        const b = px(place(this.ps[j], s, this.o2, this.env));
        ctx.strokeStyle = `rgba(148,164,255,${k * 0.16 * la})`;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
    // 2) 기록 행(칸·채움·기록 헤드·확인 점)
    this.drawLedger();
    // 3) 지나온 길(꼬리): 옮겨 가는 중인 가까운 별과 기록 칸에 앉는 별만
    ctx.lineCap = 'round';
    for (const p of this.ps) {
      if (p.z < 0.5 && p.ink < 0) continue;
      const t = s % 1 === 0 ? 0 : progress(p, s);
      if (t <= 0.08 || t >= 0.92) continue;
      const a0 = px(place(p, s, this.o, this.env));
      const a1 = px(place(p, s - 0.02, this.o2, this.env));
      const c = this.color(p, s, t);
      const tz = (0.55 + 0.45 * p.z) * this.o[2];
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.3 * tz})`;
      ctx.lineWidth = Math.max(0.6, base * this.o[3] * 0.18);
      ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
      const a2 = px(place(p, s - 0.045, this.o2, this.env));
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.12 * tz})`;
      ctx.lineWidth = Math.max(0.4, base * this.o[3] * 0.1);
      ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // 4) 별
    ctx.globalCompositeOperation = 'lighter';
    const t = this.clock;
    for (const p of this.ps) {
      const o = place(p, s, this.o, this.env);
      let a = o[2];
      if (s < 1 && this.ambient) a *= 0.78 + 0.22 * Math.sin(t * 1.3 + p.phase * 3);
      if (a < 0.02) continue;
      const [x, y] = px(o);
      const d = base * o[3] * (s < 1.6 && s > 0 ? 1 : 1);
      const tier = d > 11 ? 'm' : 's';
      const c = this.colorIndex(p, s, o[4]);
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(this.spr[c][tier], x - d / 2, y - d / 2, d, d);
      // 착지 순간의 물결(기록 칸에 앉는 가까운 별): 진행 0.88→1에서 반지름이 커지며 사라진다
      if (p.ink >= 0 && p.z > 0.85 && s > 0.3 && s < 1) {
        const rl = (o[4] - 0.88) / 0.12;
        if (rl > 0 && rl < 1) {
          const cc = this.cols[c];
          ctx.globalAlpha = 1;
          ctx.strokeStyle = `rgba(${cc[0]},${cc[1]},${cc[2]},${0.3 * (1 - rl)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, 2 + rl * 6, 0, 6.283); ctx.stroke();
        }
      }
    }
    // 5) 실시간 수집에서 날아와 자리 잡은 별(장면 1 배경에 남는다)
    const ka = 1 - smooth(s / 0.4);
    if (ka > 0.01) {
      for (const m of this.landed) {
        if (t < m.t0) continue;
        const age = t - m.t0;
        const x = m.x * this.W + Math.sin(t * 0.21 + m.d) * 3;
        const y = m.y * this.H + Math.cos(t * 0.17 + m.d) * 3;
        ctx.globalAlpha = Math.min(1, age / 0.3) * ka * (0.75 + 0.25 * Math.sin(t * 1.3 + m.d));
        ctx.drawImage(this.spr[m.c][m.d > 9 ? 'm' : 's'], x - m.d / 2, y - m.d / 2, m.d, m.d);
      }
    }
    // 6) 실시간 수집에서 날아드는 새 기록
    this.comets = this.comets.filter((m) => t - m.t0 < 1.8);
    for (const m of this.comets) {
      const k = clamp01((t - m.t0) / 1.4);
      const e = 1 - Math.pow(1 - k, 3);
      const at = (q: number) => { const u = 1 - q; return [u * u * m.x0 + 2 * u * q * m.cx + q * q * m.x1, u * u * m.y0 + 2 * u * q * m.cy + q * q * m.y1]; };
      const [x, y] = at(e);
      const c = this.cols[m.c];
      const [xa, ya] = at(Math.max(0, e - 0.12));
      ctx.globalAlpha = 1;
      const g = ctx.createLinearGradient(xa, ya, x, y);
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},${0.55 * (1 - k * 0.6)})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(x, y); ctx.stroke();
      const d = 16 * (1 - k * 0.4);
      ctx.globalAlpha = k < 1 ? 1 : Math.max(0, 1 - (t - m.t0 - 1.4) / 0.4);
      ctx.drawImage(this.spr[m.c].m, x - d / 2, y - d / 2, d, d);
      if (k >= 1) {
        const rl = clamp01((t - m.t0 - 1.4) / 0.4);
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.4 * (1 - rl)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 3 + rl * 10, 0, 6.283); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** 입자 색: 성운·체계 이후는 활동 종류 색, 기록 칸에 앉는 동안은 그 칸(actor·verb·object) 색 */
  private colorIndex(p: Particle, s: number, t: number) {
    if (p.ink < 0) return p.verb;
    const slot = p.ink % 4;
    if (s < 1) return t > 0.5 ? slot : p.verb;
    if (s < 2) return t > 0.5 ? p.verb : slot;
    return p.verb;
  }
  private color(p: Particle, s: number, t: number) { return this.cols[this.colorIndex(p, s, t)]; }

  /** 기록 행: 칸 외곽선이 먼저 자리 잡고, 입자가 앉는 만큼 왼쪽부터 채워지며, 끝나면 확인 점이 찍힌다 */
  private drawLedger() {
    const L = this.ledger;
    const { ctx, s } = this;
    if (!L || s < 0.2 || s > 2.4) return;
    const fade = 1 - smooth((s - 1.3) / 0.4);
    if (fade <= 0.01) return;
    const ph = Math.max(8, Math.min(L.h * LEDGER.pillH, 14));
    const n = LEDGER.rows.length;
    // 두 표준(xAPI · Caliper) 사이 옅은 구분선
    const gA = smooth((s - 0.3) / 0.2) * 0.12 * fade;
    if (gA > 0.004) {
      const gy = L.y + L.h * ((LEDGER.rows[2].y + LEDGER.groups[1].headY) / 2 + 0.005);
      const g = ctx.createLinearGradient(L.x, 0, L.x + L.w, 0);
      g.addColorStop(0, 'rgba(150,164,255,0)');
      g.addColorStop(0.5, `rgba(150,164,255,${gA})`);
      g.addColorStop(1, 'rgba(150,164,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(L.x, gy, L.w, 1);
    }
    LEDGER.rows.forEach((row, ri) => {
      const rp = clamp01((s - 0.3 - (ri / n) * 0.35) / 0.4);
      if (rp <= 0.001) return;
      const y = L.y + row.y * L.h;
      const py = y - ph / 2;
      const first = row.pills[0];
      const last = row.pills[row.pills.length - 1];
      const x0 = L.x + first.x * L.w;
      const x1 = L.x + (last.x + last.w) * L.w;
      const sweep = x0 + (x1 - x0) * rp;
      ctx.save();
      ctx.globalAlpha = fade;
      // 행 바탕 띠
      rr(ctx, x0 - 8, py - 6, x1 - x0 + 16, ph + 12, (ph + 12) / 2);
      ctx.fillStyle = `rgba(255,255,255,${0.025 * rp})`;
      ctx.fill();
      const gl = clamp01((rp - 0.72) / 0.28);
      if (gl > 0.01) {
        rr(ctx, x0 - 6, py - 4, x1 - x0 + 12, ph + 8, (ph + 8) / 2);
        ctx.fillStyle = `rgba(124,120,255,${gl * 0.12})`;
        ctx.fill();
      }
      for (const pl of row.pills) {
        const c = this.cols[pl.slot];
        const x = L.x + pl.x * L.w;
        const w = pl.w * L.w;
        rr(ctx, x, py, w, ph, ph / 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.25 + rp * 0.6})`;
        ctx.stroke();
        const fw = clamp01((sweep - x) / w) * w;
        if (fw > 0.5) {
          ctx.save();
          rr(ctx, x, py, w, ph, ph / 2);
          ctx.clip();
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.28)`;
          ctx.fillRect(x, py, fw, ph);
          ctx.fillStyle = 'rgba(255,255,255,0.09)';
          for (let tx = x + 7; tx < x + fw - 3; tx += 14) ctx.fillRect(tx, py + 2.5, 1, ph - 5);
          ctx.restore();
        }
      }
      // 기록 헤드(지금 쓰는 중)
      const sw = Math.min(1, (rp - 0.1) / 0.15, (0.9 - rp) / 0.15);
      if (sw > 0.01) {
        const g = ctx.createLinearGradient(0, py - 6, 0, py + ph + 6);
        g.addColorStop(0, 'rgba(170,185,255,0)');
        g.addColorStop(0.5, `rgba(170,185,255,${0.55 * sw})`);
        g.addColorStop(1, 'rgba(170,185,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sweep - 1, py - 6, 2, ph + 12);
        ctx.fillStyle = `rgba(220,228,255,${0.7 * sw})`;
        ctx.beginPath(); ctx.arc(sweep, y, 2, 0, 6.283); ctx.fill();
      }
      // 행머리 점(심볼 그라디언트 + 마젠타 빛)
      const hx = L.x + LEDGER.headX * L.w;
      const hg = ctx.createRadialGradient(hx, y, 2.7, hx, y, 16);
      hg.addColorStop(0, 'rgba(233,48,176,.8)');
      hg.addColorStop(0.34, 'rgba(233,48,176,.4)');
      hg.addColorStop(1, 'rgba(233,48,176,0)');
      ctx.globalAlpha = rp * fade;
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(hx, y, 16, 0, 6.283); ctx.fill();
      const lg = ctx.createLinearGradient(hx - 4.5, 0, hx + 4.5, 0);
      lg.addColorStop(0, '#e930b0'); lg.addColorStop(0.52, '#7c4dff'); lg.addColorStop(1, '#2f7cff');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(hx, y, 4.5, 0, 6.283); ctx.fill();
      // 확인 점(행 완성)
      const cA = clamp01((rp - 0.7) / 0.3);
      if (cA > 0.01) {
        const cx = L.x + LEDGER.checkX * L.w;
        const pop = 1 - (1 - cA) * (1 - cA);
        const sc = 1.3 - 0.3 * pop;
        const aa = Math.min(1, cA * 2.4) * fade;
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(163,177,255,${aa})`;
        ctx.beginPath(); ctx.arc(cx, y, 3.4 * sc, 0, 6.283); ctx.fill();
        ctx.strokeStyle = `rgba(163,177,255,${aa * 0.5})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, y, 5.8 * sc, 0, 6.283); ctx.stroke();
      }
      ctx.restore();
    });
  }

  destroy() {
    this.ambient = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

/** 흰 코어 + 색 번짐(겹칠수록 가운데가 밝아져 평면 점이 아니라 광원으로 읽힌다) */
function sprite(rgb: number[], size: number, coreA: number, midA: number) {
  const s = document.createElement('canvas');
  s.width = s.height = size;
  const q = s.getContext('2d')!;
  const h = size / 2;
  const g = q.createRadialGradient(h, h, 0, h, h, h);
  const c = `${rgb[0]},${rgb[1]},${rgb[2]}`;
  g.addColorStop(0, `rgba(255,255,255,${coreA})`);
  g.addColorStop(0.22, `rgba(${c},${midA})`);
  g.addColorStop(0.58, `rgba(${c},${midA * 0.32})`);
  g.addColorStop(1, `rgba(${c},0)`);
  q.fillStyle = g;
  q.fillRect(0, 0, size, size);
  return s;
}
/** 먼 보케: 흰 코어 없는 부드러운 원 */
function bokeh(rgb: number[], size: number) {
  const s = document.createElement('canvas');
  s.width = s.height = size;
  const q = s.getContext('2d')!;
  const h = size / 2;
  const g = q.createRadialGradient(h, h, 0, h, h, h);
  const c = `${rgb[0]},${rgb[1]},${rgb[2]}`;
  g.addColorStop(0, `rgba(${c},.4)`);
  g.addColorStop(0.7, `rgba(${c},.22)`);
  g.addColorStop(1, `rgba(${c},0)`);
  q.fillStyle = g;
  q.fillRect(0, 0, size, size);
  return s;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
