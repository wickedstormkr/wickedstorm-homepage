/**
 * 데이터 아트 주 층(캔버스 2D, 입자 = 오늘 수집 1,374건).
 * 별 하나하나를 광원처럼: 흰 코어 + 색 번짐 스프라이트를 가까움(z)에 따라 크기를 나눠
 * 'lighter' 합성으로 겹쳐 그린다(지금 사이트 히어로와 같은 방식).
 * 움직임: 입자마다 장면 값의 자리(목표)를 부드럽게 따라간다(지수 감쇠, 입자마다 빠르기가 조금씩 달라 흐름이 생긴다).
 * 선 꼬리 대신 빠르기만큼 늘어나는 빛(모션 블러)으로 그려, 빠르게 스크롤해도 끊기지 않고 매끄럽다. 움직임 멈춤이면 제자리로 바로.
 * 장면 1: 옅은 성운. 실시간 수집 창에서 밀려난 한 건은 HTML 층(story/live.ts)이 날려 보내고, 도착하면 여기서 같은 별 모양으로 자리 잡는다(land)
 * 장면 2: 기록 행(누가 · ~하다 · 무엇을 · 부가 정보)에 입자가 착지하며 줄마다 알약이 왼쪽부터 끝까지 차오른다(지금 사이트의 기록 레저)
 * 장면 3: CASE 성취 항목(지표)마다 모인다
 * 장면 4: 이상 탐지 화면의 그래프 칸에 시간축 분포로 착지(직전 학기 점선과 비교, 3주차 구간이 솟는다)
 * 장면 5·6: 근거 줄기 → 선순환 고리(story-data.ts place)
 */
import { buildParticles, place, signalCurves, chartX, CHART, SPIKE, HOT_WEEK, VERBS, VERB_COLOR, LEDGER, type Particle, type PlaceEnv, type BoxMap } from '../../lib/story-data';
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
  /** 입자의 지금 자리(그림 칸 기준 x, y)와 따라가는 빠르기(초당) */
  private cur: Float32Array;
  private rate: Float32Array;
  private primed = false;
  private lastT = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d');
    this.ctx = ctx;
    this.ps = buildParticles();
    this.curves = signalCurves(this.ps);
    this.cur = new Float32Array(this.ps.length * 2);
    // 가까운(밝은) 별일수록 조금 더 빨리 따라온다: 뒤쪽 별이 늦게 흘러와 깊이가 생긴다.
    // 장면 값 자체가 이미 스크롤을 부드럽게 따라가므로(Lenis·scrub), 여기서는 짧게(시간 상수 0.06~0.11초):
    // 더 길면 장면 글·그림보다 입자가 0.3~0.8초 늦게 도착해 굼떠 보인다.
    this.rate = Float32Array.from(this.ps, (p) => 9 + p.z * 5 + p.phase * 0.5);
    // 색: 활동 종류(시청·응답·제출·질문). 기록 칸 색(누가 파랑 · ~하다 보라 · 무엇을 마젠타 · 부가 정보 강조색)도 같은 넷
    this.cols = VERBS.map((v) => hexRgb(VERB_COLOR[v]));
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

    // 1) 기록 행(칸·채움·눈금·기록 헤드·줄 머리 점·확인 점)과 저장 완료의 빛
    this.drawLedger();
    // 2) 분포 그래프의 곡선(직전 학기 점선 · 이번 학기 선 · 솟은 구간의 빛)
    this.drawChart();
    // 3) 별: 목표 자리를 부드럽게 따라가고, 움직이는 동안은 빠르기만큼 늘어난 빛으로
    const t = this.clock;
    // 프레임이 느린 브라우저(Safari 30fps 안팎, 가끔 80ms)에서도 입자가 실제 시간만큼 따라오게 넉넉히 둔다(지수 감쇠라 커도 튀지 않는다)
    const dt = Math.min(0.12, Math.max(0, t - this.lastT));
    this.lastT = t;
    const follow = this.ambient && this.primed && dt > 0;
    this.primed = true;
    ctx.globalCompositeOperation = 'lighter';
    const ps = this.ps;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const o = place(p, s, this.o, this.env);
      let x = o[0];
      let y = o[1];
      let vx = 0;
      let vy = 0;
      if (follow) {
        const k = 1 - Math.exp(-dt * this.rate[i]);
        const cx = this.cur[i * 2];
        const cy = this.cur[i * 2 + 1];
        x = cx + (x - cx) * k;
        y = cy + (y - cy) * k;
        vx = (x - cx) * box.w;
        vy = (y - cy) * box.h;
      }
      this.cur[i * 2] = x;
      this.cur[i * 2 + 1] = y;
      let a = o[2];
      if (s < 1 && this.ambient) a *= 0.78 + 0.22 * Math.sin(t * 1.3 + p.phase * 3);
      if (a < 0.02) continue;
      const X = box.x + x * box.w;
      const Y = box.y + y * box.h;
      const d = base * o[3];
      const c = this.colorIndex(p, s, o[4]);
      const img = this.spr[c][d > 11 ? 'm' : 's'];
      const sp = Math.hypot(vx, vy);
      if (sp > 0.9) {
        // 모션 블러: 진행 방향 뒤로 늘인 빛(머리는 지금 자리), 늘어난 만큼 옅게
        const L = d + Math.min(sp * 2.4, 30);
        const cos = vx / sp;
        const sin = vy / sp;
        ctx.globalAlpha = Math.min(1, a * Math.min(1, (d * 1.5) / L));
        ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * X, dpr * Y);
        ctx.drawImage(img, d / 2 - L, -d / 2, L, d);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(img, X - d / 2, Y - d / 2, d, d);
      }
      // 착지 순간의 물결(기록 칸에 앉는 가까운 별): 진행 0.88→1에서 반지름이 커지며 사라진다
      if (p.ink >= 0 && p.z > 0.85 && s > 0.3 && s < 1) {
        const rl = (o[4] - 0.88) / 0.12;
        if (rl > 0 && rl < 1) {
          const cc = this.cols[c];
          ctx.globalAlpha = 1;
          ctx.strokeStyle = `rgba(${cc[0]},${cc[1]},${cc[2]},${0.26 * (1 - rl)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(X, Y, 2 + rl * 6, 0, 6.283); ctx.stroke();
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

  /** 입자 색: 성운·체계 이후는 활동 종류 색, 기록 칸에 앉는 동안은 그 칸(누가·~하다·무엇을·부가 정보) 색 */
  private colorIndex(p: Particle, s: number, t: number) {
    if (p.ink < 0) return p.verb;
    const slot = p.ink % 4;
    if (s < 1) return t > 0.5 ? slot : p.verb;
    if (s < 2) return t > 0.5 ? p.verb : slot;
    return p.verb;
  }

  /**
   * 기록 행(지금 사이트의 기록 레저): 줄마다 칸 틀이 옅게 자리 잡고, 기록 헤드가 왼쪽에서 오른쪽으로 지나가며
   * 칸을 끝까지 채운다(채움 위 데이터 눈금). 줄 머리 점(브랜드 그라디언트), 다 쓰면 줄 끝 확인 점과 옅은 줄 빛.
   * 마지막 줄까지 차면 옅은 빛 띠가 레저를 위에서 아래로 한 번 훑는다(저장 완료).
   */
  private drawLedger() {
    const L = this.ledger;
    const { ctx, s } = this;
    if (!L || s < 0.2 || s > 2.4) return;
    const fade = 1 - smooth((s - 1.3) / 0.25);
    if (fade <= 0.01) return;
    const ph = Math.max(8, Math.min(L.h * LEDGER.pillH, 14));
    const n = LEDGER.rows.length;
    const hr = 4.5;
    ctx.save();
    LEDGER.rows.forEach((row, ri) => {
      const rp = clamp01((s - 0.28 - (ri / n) * 0.34) / 0.4);
      if (rp <= 0.001) return;
      const y = L.y + row.y * L.h;
      const py = y - ph / 2;
      const first = row.pills[0];
      const last = row.pills[row.pills.length - 1];
      const x0 = L.x + first.x * L.w;
      const x1 = L.x + (last.x + last.w) * L.w;
      const sweep = x0 + (x1 - x0) * rp;
      ctx.globalAlpha = fade;
      // 줄 빛(완성 무렵)
      const gl = clamp01((rp - 0.72) / 0.28);
      if (gl > 0.01) {
        rr(ctx, x0 - 6, py - 4, x1 - x0 + 12, ph + 8, (ph + 8) / 2);
        ctx.fillStyle = `rgba(124,120,255,${0.16 * gl})`;
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
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.3)`;
          ctx.fillRect(x, py, fw, ph);
          ctx.fillStyle = 'rgba(255,255,255,0.09)';
          for (let tx = x + 7; tx < x + fw - 3; tx += 14) ctx.fillRect(tx, py + 2.5, 1, ph - 5);
          ctx.restore();
        }
      }
      // 기록 헤드(지금 쓰는 중)
      const sw = Math.min(1, (rp - 0.1) / 0.15, (0.9 - rp) / 0.15);
      if (sw > 0.01) {
        const sy0 = py - 5;
        const sy1 = py + ph + 5;
        const g = ctx.createLinearGradient(0, sy0, 0, sy1);
        g.addColorStop(0, 'rgba(170,185,255,0)');
        g.addColorStop(0.5, `rgba(170,185,255,${0.5 * sw})`);
        g.addColorStop(1, 'rgba(170,185,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sweep - 1, sy0, 2, sy1 - sy0);
        const wg = ctx.createLinearGradient(0, sy0, 0, sy1);
        wg.addColorStop(0, 'rgba(170,185,255,0)');
        wg.addColorStop(0.5, `rgba(170,185,255,${0.12 * sw})`);
        wg.addColorStop(1, 'rgba(170,185,255,0)');
        ctx.fillStyle = wg;
        ctx.fillRect(sweep - 4, sy0, 8, sy1 - sy0);
        ctx.fillStyle = `rgba(220,228,255,${0.65 * sw})`;
        ctx.beginPath(); ctx.arc(sweep, y, 2, 0, 6.283); ctx.fill();
      }
      // 줄 머리 점(실시간 수집 창의 점과 같은 모양): 옅은 빛 + 브랜드 그라디언트
      const hx = L.x + LEDGER.headX * L.w;
      ctx.globalAlpha = rp * fade;
      const hg = ctx.createRadialGradient(hx, y, hr * 0.6, hx, y, hr + 12);
      hg.addColorStop(0, 'rgba(233,48,176,.8)');
      hg.addColorStop(0.34, 'rgba(233,48,176,.4)');
      hg.addColorStop(1, 'rgba(233,48,176,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(hx, y, hr + 12, 0, 6.283); ctx.fill();
      const lg = ctx.createLinearGradient(hx - hr, 0, hx + hr, 0);
      lg.addColorStop(0, '#e930b0'); lg.addColorStop(0.52, '#7c4dff'); lg.addColorStop(1, '#2f7cff');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(hx, y, hr, 0, 6.283); ctx.fill();
      // 확인 점(줄 완성): 커졌다가 제 크기로 찍힌다
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
    });
    // 저장 완료: 마지막 줄이 찬 뒤(s .88~1.0) 옅은 빛 띠가 레저를 위에서 아래로 한 번
    const cf = clamp01((s - 0.88) / 0.14);
    if (cf > 0.001 && cf < 0.999) {
      const e = cf * cf * (3 - 2 * cf);
      const yy = L.y - 60 + (L.h + 120) * e;
      const pk = Math.sin(cf * Math.PI);
      const g2 = ctx.createLinearGradient(0, yy - 55, 0, yy + 55);
      g2.addColorStop(0, 'rgba(165,180,255,0)');
      g2.addColorStop(0.5, `rgba(165,180,255,${0.06 * pk})`);
      g2.addColorStop(1, 'rgba(165,180,255,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g2;
      ctx.fillRect(L.x - 30, yy - 55, L.w + 60, 110);
    }
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
