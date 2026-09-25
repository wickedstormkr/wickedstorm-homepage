/**
 * 데이터 아트 주 층(캔버스 2D, 입자 = 오늘 수집 1,374건).
 * 별 하나하나를 광원처럼: 흰 코어 + 색 번짐 스프라이트를 가까움(z)에 따라 크기를 나눠
 * 'lighter' 합성으로 겹쳐 그린다(지금 사이트 히어로와 같은 방식). 옮겨 가는 동안에는 짧은 꼬리를 남긴다.
 * 장면 1: 옅은 성운. 실시간 수집 창에서 밀려난 한 건은 HTML 층(story/live.ts)이 날려 보내고, 도착하면 여기서 같은 별 모양으로 자리 잡는다(land)
 * 장면 2: 기록 행(누가 · ~하다 · 무엇을 · 부가 정보)에 입자가 착지하며 심볼 모양의 막대가 왼쪽부터 차오른다
 * 장면 3: CASE 성취 항목(지표)마다 모인다
 * 장면 4: 이상 탐지 화면의 그래프 칸에 시간축 분포로 착지(직전 학기 점선과 비교, 3주차 구간이 솟는다)
 * 장면 5·6: 근거 줄기 → 선순환 고리(story-data.ts place)
 */
import { buildParticles, place, progress, signalCurves, chartX, CHART, SPIKE, HOT_WEEK, VERBS, VERB_COLOR, LEDGER, ROW_COLOR, type Particle, type PlaceEnv, type BoxMap } from '../../lib/story-data';
import type { Art, ArtBox, ArtAnchors } from './art-types';

type Rect = { x: number; y: number; w: number; h: number };
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const hexRgb = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
/** 한 장면 안에서만 보이는 층의 밝기: from~to 사이 1, 양끝은 부드럽게 */
const windowed = (s: number, a: number, b: number, c: number, d: number) => smooth((s - a) / (b - a)) * (1 - smooth((s - c) / (d - c)));

interface Sprites { s: HTMLCanvasElement; m: HTMLCanvasElement }
/** 실시간 수집에서 날아와 자리 잡은 새 별(무대 기준 0~1) */
interface Landed { x: number; y: number; c: number; t0: number; d: number }

export class CanvasArt implements Art {
  private ctx: CanvasRenderingContext2D;
  private ps: Particle[];
  private spr: Sprites[];
  private cols: number[][];
  private curves: { now: Float32Array; prev: Float32Array; G: number };
  private box: ArtBox = { x: 0, y: 0, w: 1, h: 1 };
  private W = 1;
  private H = 1;
  private ledger: Rect | null = null;
  private chart: Rect | null = null;
  private env: PlaceEnv = {};
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
    this.curves = signalCurves(this.ps);
    // 색: 0~3 활동 종류(시청·응답·제출·질문), 4~7 기록 행의 줄 색(심볼처럼 마젠타 → 파랑 네 단계)
    this.cols = [...VERBS.map((v) => hexRgb(VERB_COLOR[v])), ...ROW_COLOR.map(hexRgb)];
    this.spr = this.cols.map((c) => ({ s: sprite(c, 16, 0.9, 0.78), m: sprite(c, 36, 0.85, 0.62) }));
  }

  resize(w: number, h: number, box: ArtBox, a: ArtAnchors = {}) {
    this.W = w;
    this.H = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.box = box;
    this.ledger = a.ledger ?? null;
    this.chart = a.chart ?? null;
    const toBox = (R: Rect): BoxMap => ({ x0: (R.x - box.x) / box.w, y0: (R.y - box.y) / box.h, sx: R.w / box.w, sy: R.h / box.h });
    const stage: BoxMap = { x0: -box.x / box.w, y0: -box.y / box.h, sx: w / box.w, sy: h / box.h };
    this.env = {
      ...this.env,
      stage,
      ledger: this.ledger ? toBox(this.ledger) : undefined,
      chart: this.chart ? toBox(this.chart) : undefined,
      shift: a.shift,
    };
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
   * 실시간 수집 창에서 날아온 한 건(무대 px, 활동 종류)이 성운에 자리 잡는다: 성운의 가까운 별과 같은 스프라이트·크기.
   * 장면 1 동안만 보이고(글과 함께 물러난다), 많아지면 오래된 것부터 지운다.
   */
  land(x: number, y: number, verb: number) {
    this.landed.push({ x: x / this.W, y: y / this.H, c: verb, t0: this.clock, d: 0.9 + Math.random() * 0.5 });
    if (this.landed.length > 90) this.landed.shift();
    if (!this.raf) this.draw();
  }

  private draw() {
    const { ctx, box, dpr, s } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    this.env.time = this.clock;
    const base = Math.max(4.5, box.w * 0.0095);
    const px = (o: ArrayLike<number>) => [box.x + o[0] * box.w, box.y + o[1] * box.h];

    // 2) 기록 행(칸·채움·기록 헤드·확인 점)
    this.drawLedger();
    // 3) 분포 그래프의 곡선(직전 학기 점선 · 이번 학기 선 · 솟은 구간의 빛)
    this.drawChart();
    // 4) 지나온 길(꼬리): 옮겨 가는 중인 가까운 별과 기록 칸에 앉는 별만, 짧게(글 위를 긋지 않게 24px 안)
    ctx.lineCap = 'round';
    for (const p of this.ps) {
      if (p.z < 0.5 && p.ink < 0) continue;
      const t = s % 1 === 0 ? 0 : progress(p, s);
      if (t <= 0.08 || t >= 0.92) continue;
      const a0 = px(place(p, s, this.o, this.env));
      if (this.o[4] === 0) continue; // 제자리에서 흐려지거나 밝아지는 입자
      const alpha = this.o[2];
      const size = this.o[3];
      const c = this.color(p, s, t);
      const tz = (0.55 + 0.45 * p.z) * alpha;
      const a1 = clampSeg(a0, px(place(p, s - 0.008, this.o2, this.env)), 14);
      const a2 = clampSeg(a1, px(place(p, s - 0.018, this.o2, this.env)), 10);
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.2 * tz})`;
      ctx.lineWidth = Math.max(0.6, base * size * 0.16);
      ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.08 * tz})`;
      ctx.lineWidth = Math.max(0.4, base * size * 0.09);
      ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // 5) 별
    ctx.globalCompositeOperation = 'lighter';
    const t = this.clock;
    for (const p of this.ps) {
      const o = place(p, s, this.o, this.env);
      let a = o[2];
      if (s < 1 && this.ambient) a *= 0.78 + 0.22 * Math.sin(t * 1.3 + p.phase * 3);
      if (a < 0.02) continue;
      const [x, y] = px(o);
      const d = base * o[3];
      const c = this.colorIndex(p, s, o[4]);
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(this.spr[c][d > 11 ? 'm' : 's'], x - d / 2, y - d / 2, d, d);
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
    // 6) 실시간 수집에서 날아와 자리 잡은 별(성운의 가까운 별과 같은 모양, 장면 1 동안)
    const ka = 1 - smooth(s / 0.3);
    if (ka > 0.01) {
      for (const m of this.landed) {
        const age = t - m.t0;
        const d = base * m.d * (age < 0.35 ? 1 + (0.35 - age) * 1.6 : 1);
        const x = m.x * this.W;
        const y = m.y * this.H;
        ctx.globalAlpha = Math.min(1, 0.35 + age * 2) * ka * 0.8 * (0.82 + 0.18 * Math.sin(t * 1.3 + m.d * 9));
        ctx.drawImage(this.spr[m.c].s, x - d / 2, y - d / 2, d, d);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** 입자 색: 성운·체계 이후는 활동 종류 색, 기록 행에 앉는 동안은 그 줄의 색(심볼처럼 마젠타 → 파랑) */
  private colorIndex(p: Particle, s: number, t: number) {
    if (p.ink < 0) return p.verb;
    const row = 4 + Math.floor(p.ink / 4);
    if (s < 1) return t > 0.5 ? row : p.verb;
    if (s < 2) return t > 0.5 ? p.verb : row;
    return p.verb;
  }
  private color(p: Particle, s: number, t: number) { return this.cols[this.colorIndex(p, s, t)]; }

  /** 기록 행: 입자가 앉는 만큼 막대가 왼쪽부터 차오르고, 다 차면 심볼과 같은 네 줄 막대가 된다(빈 틀은 그리지 않는다) */
  private drawLedger() {
    const L = this.ledger;
    const { ctx, s } = this;
    if (!L || s < 0.2 || s > 2.4) return;
    const fade = 1 - smooth((s - 1.3) / 0.25);
    if (fade <= 0.01) return;
    const bh = Math.max(8, Math.min(L.h * LEDGER.barH, 30));
    const n = LEDGER.rows.length;
    ctx.save();
    LEDGER.rows.forEach((row, ri) => {
      const rp = clamp01((s - 0.3 - (ri / n) * 0.35) / 0.4);
      if (rp <= 0.001) return;
      const c = this.cols[4 + ri];
      const y = L.y + row.y * L.h;
      const sweep = L.x + L.w * rp;
      for (const b of row.bars) {
        const x = L.x + b.x * L.w;
        const w = b.w * L.w;
        const filled = Math.min(w, sweep - x);
        if (filled <= 0.5) continue;
        const fw = Math.max(bh, filled);
        rr(ctx, x, y - bh / 2, fw, bh, bh / 2);
        ctx.globalAlpha = fade;
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.5)`;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.9)`;
        ctx.stroke();
      }
      // 쓰는 중인 자리(옅은 빛 선)
      const sw = Math.min(1, (rp - 0.05) / 0.1, (0.95 - rp) / 0.1);
      if (sw > 0.01) {
        const g = ctx.createLinearGradient(0, y - bh, 0, y + bh);
        g.addColorStop(0, 'rgba(220,228,255,0)');
        g.addColorStop(0.5, `rgba(220,228,255,${0.6 * sw * fade})`);
        g.addColorStop(1, 'rgba(220,228,255,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(sweep - 1, y - bh, 2, bh * 2);
      }
    });
    ctx.restore();
  }

  /** 분포 그래프: 직전 학기(점선)와 이번 학기(선), 그리고 3주차 13:25–14:40 구간 뒤의 옅은 빛 */
  private drawChart() {
    const C = this.chart;
    const { ctx, s } = this;
    if (!C) return;
    const k = windowed(s, 2.72, 2.92, 3.3, 3.45);
    if (k <= 0.01) return;
    const X = (u: number) => C.x + u * C.w;
    const Y = (v: number) => C.y + v * C.h;
    const { now, prev, G } = this.curves;
    ctx.save();
    // 솟은 구간 뒤의 빛
    const sx = X(chartX(HOT_WEEK + SPIKE.at));
    const band = ctx.createRadialGradient(sx, Y(CHART.base), 0, sx, Y(CHART.base), C.h * 0.9);
    band.addColorStop(0, `rgba(233,48,176,${0.22 * k})`);
    band.addColorStop(1, 'rgba(233,48,176,0)');
    ctx.fillStyle = band;
    ctx.fillRect(sx - C.h * 0.9, Y(CHART.top) - 10, C.h * 1.8, Y(CHART.base) - Y(CHART.top) + 10);
    // 바닥선
    ctx.strokeStyle = `rgba(255,255,255,${0.14 * k})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(CHART.x0), Y(CHART.base) + 0.5); ctx.lineTo(X(CHART.x1), Y(CHART.base) + 0.5); ctx.stroke();
    const path = (c: Float32Array) => {
      ctx.beginPath();
      for (let g = 0; g < G; g++) {
        const x = X(chartX(((g + 0.5) / G) * 6));
        const y = Y(CHART.base - c[g] * (CHART.base - CHART.top));
        if (g === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    };
    // 직전 학기: 점선
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = `rgba(163,177,255,${0.6 * k})`;
    ctx.lineWidth = 1.4;
    path(prev);
    ctx.stroke();
    // 이번 학기: 선
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(238,241,251,${0.32 * k})`;
    ctx.lineWidth = 1.2;
    path(now);
    ctx.stroke();
    ctx.restore();
  }

  destroy() {
    this.ambient = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

/** 꼬리 한 마디를 길이 max(px) 안으로 */
function clampSeg(a: number[], b: number[], max: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy);
  return d <= max || d === 0 ? b : [a[0] + (dx * max) / d, a[1] + (dy * max) / d];
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
