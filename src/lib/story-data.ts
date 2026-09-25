/**
 * 오프닝 여섯 장면의 데이터 아트 모델(CLAUDE.md '데이터 아트는 진짜 데이터 구조로만').
 * - 입자 하나 = xAPI Statement 하나(누가·무엇을·어느 성취 항목·몇 주차)
 * - 입자가 모이는 자리 = 1EdTech CASE 성취 항목(학습성과)
 * - 색 = 활동 종류(시청·응답·제출·질문)
 * 시연 데이터는 docs/source/mockups/lrs-event-store-anomaly.html(생활경제와 금융, 3주차 이상 신호)과 같다.
 *
 * 같은 씨앗값으로 언제나 같은 모양을 만든다. 빌드 때 미리 그린 그림(SVG, src/pages/art/*),
 * 캔버스, WebGL이 모두 이 모듈을 쓰므로 세 층이 같은 그림을 그린다.
 * 좌표: 장면 1 성운(G)은 무대 전체 기준(0~1), 장면 2 기록 행(R)은 기록 칸 기준(0~1),
 * 장면 4 분포(B)는 이상 탐지 화면의 그래프 칸 기준(0~1), 장면 3·5·6은 16:10 그림 칸 기준.
 * 그릴 때 place()가 모두 그림 칸 기준으로 바꾼다.
 */

export const VERBS = ['watched', 'answered', 'submitted', 'asked'] as const;
export type Verb = (typeof VERBS)[number];
/** 활동 종류 색(브랜드 팔레트 안): 시청 파랑 · 응답 보라 · 제출 마젠타 · 질문 강조색 */
export const VERB_COLOR: Record<Verb, string> = {
  watched: '#2f7cff',
  answered: '#7c4dff',
  submitted: '#e930b0',
  asked: '#a3b1ff',
};
export const ART_ASPECT = 1.6;
/** 성취 항목에 모인 입자 무리의 가로 반지름(그림 칸 비율). 이름표는 이만큼 오른쪽에 둔다 */
export const LEAF_R = 0.06;
/** 근거 묶음(장면 5)의 기준 중심. 화면에서는 신호 알림 옆으로 옮겨 그린다(place의 shift) */
export const D_CENTER: [number, number] = [0.12, 0.08];

export interface CaseNode {
  id: string;
  parent: string | null;
  /** 학습성과(잎)만: 오늘 수집 Statement 수(시연) */
  count?: number;
  x: number;
  y: number;
  anomaly?: boolean;
}

/** CASE 교과역량 체계(시연): CFDocument → 전공 성취 → 교과역량 3 → 학습성과 6 */
export const CASE_NODES: CaseNode[] = [
  { id: 'root', parent: null, x: 0.05, y: 0.5 },
  { id: 'major', parent: 'root', x: 0.23, y: 0.5 },
  { id: 'c1', parent: 'major', x: 0.44, y: 0.175 },
  { id: 'o1', parent: 'c1', x: 0.7, y: 0.1, count: 218 },
  { id: 'o2', parent: 'c1', x: 0.7, y: 0.25, count: 294, anomaly: true },
  { id: 'c2', parent: 'major', x: 0.44, y: 0.505 },
  { id: 'o3', parent: 'c2', x: 0.7, y: 0.43, count: 306 },
  { id: 'o4', parent: 'c2', x: 0.7, y: 0.58, count: 190 },
  { id: 'c3', parent: 'major', x: 0.44, y: 0.835 },
  { id: 'o5', parent: 'c3', x: 0.7, y: 0.76, count: 204 },
  { id: 'o6', parent: 'c3', x: 0.7, y: 0.91, count: 162 },
];
export const LEAVES = CASE_NODES.filter((n) => n.count);
export const TODAY_TOTAL = LEAVES.reduce((a, n) => a + (n.count ?? 0), 0); // 1,374
export const ANOMALY_LEAF = LEAVES.findIndex((n) => n.anomaly);

/** '위험요인 비교' 항목의 주차별 문장 비중(3주차가 높다) */
export const WEEK_WEIGHTS = [26, 34, 86, 30, 24, 20];
export const WEEKS = WEEK_WEIGHTS.length;
export const HOT_WEEK = 2; // 0부터 센 3주차
/** 3주차 안에서 멈춤·되감기·오답이 몰린 구간(13:25–14:40)의 자리(주 안 비율)와 폭 */
export const SPIKE = { at: 0.42, sd: 0.045, share: 0.45 };

/**
 * 장면 4 분포 그래프: 이상 탐지 화면의 그래프 칸 기준(0~1). 가로는 6주 시간축, 세로는 그 시각 문장의 밀도.
 * 격자로 쌓지 않고, 문장마다 실제 일어난 시각(주·요일·구간)에 놓고 밀도 곡선 아래에 흩어 그린다.
 */
export const CHART = { x0: 0.035, x1: 0.975, base: 0.84, top: 0.12 };
export const chartX = (weeks: number) => CHART.x0 + (weeks / WEEKS) * (CHART.x1 - CHART.x0);

/** 결정적 난수(mulberry32) */
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 장면 2 기록 행: 한 줄이 학습데이터 한 건. 같은 칸을 xAPI와 1EdTech Caliper가 각자의 이름으로 부른다.
 * 누가(actor) · ~하다(xAPI verb ⇄ Caliper action) · 무엇을(object) · 부가 정보(xAPI context·result ⇄ Caliper edApp·group·session 등).
 * 칸(열)은 표준이 정한 틀이라 모든 줄이 같고, 채워진 길이만 줄마다 다르다. 부가 정보 칸이 가장 넓고 가장 차 있다.
 * 칸 색: actor 파랑 · verb 보라 · object 마젠타 · 부가 정보 강조색. 좌표는 기록 칸(ledger box) 기준 0~1.
 */
export const SLOTS = ['actor', 'verb', 'object', 'extra'] as const;
export const SLOT_COLOR = ['#2f7cff', '#7c4dff', '#e930b0', '#a3b1ff'];
export interface LedgerPill { x: number; w: number; slot: number; fill: number; cap: number }
export interface LedgerRow { y: number; pills: LedgerPill[] }
export const LEDGER_ASPECT = 3.1;
export const LEDGER = (() => {
  const r = rng(11);
  const px0 = 0.03;
  const px1 = 0.955;
  const gap = 0.008;
  const frac = [0.15, 0.19, 0.25, 0.41];
  const avail = px1 - px0 - (frac.length - 1) * gap;
  let x = px0;
  const cols = frac.map((f) => {
    const c = { x, w: f * avail };
    x += f * avail + gap;
    return c;
  });
  const N = 6;
  const rows: LedgerRow[] = Array.from({ length: N }, (_, i) => ({
    y: (i + 0.5) / N,
    pills: cols.map((c, slot) => {
      const fill = slot === 3 ? 0.84 + r() * 0.16 : 0.48 + r() * 0.46;
      return { x: c.x, w: c.w, slot, fill, cap: Math.max(4, Math.round(c.w * fill * 60)) };
    }),
  }));
  return { cols, rows, px0, px1, gap, headX: 0.008, checkX: 0.978, pillH: 0.07 };
})();

export interface Particle {
  verb: number; // VERBS 번호
  leaf: number; // LEAVES 번호
  week: number; // 0~5
  evidence: boolean; // 장면 5에서 교수자 화면으로 가는 근거 문장
  delay: number; // 0~1 흐름 순서
  phase: number; // 떠다님 위상
  curve: number; // 장면 사이를 옮겨 갈 때 휘는 정도(-0.25~0.25)
  z: number; // 깊이(0 먼~1 가까운): 크기·밝기·빛 번짐
  G: [number, number]; // 장면 1 성운(무대 기준)
  ink: number; // 장면 2에서 기록 칸에 앉는 문장이면 칸 번호(줄*4+칸), 아니면 -1
  tt: number; // 이상 항목 문장만: 일어난 시각(0~6주), 아니면 -1
  spike: boolean; // 3주차 13:25–14:40 구간에 몰린 문장
  R: [number, number]; // 장면 2 기록 칸 자리(기록 칸 기준)
  T: [number, number]; // 성취 항목 자리(장면 3)
  B: [number, number]; // 분포 그래프 자리(장면 4, 이상 항목만, 그래프 칸 기준)
  D: [number, number]; // 근거 묶음(장면 5)
  L: [number, number]; // 선순환 고리(장면 6, 회전 0)
  La: [number, number]; // 선순환 고리의 각도·반지름(그릴 때 돌린다)
}

function pickWeighted(r: () => number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  let x = r() * sum;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

/** 성운 덩어리(무대 기준): 균일하게 흩으면 벽지처럼 보여, 반은 덩어리 셋 둘레에 모은다 */
const NEBULA = [[0.26, 0.3], [0.78, 0.28], [0.62, 0.76]];

/** 선순환 고리: 그림 칸 기준 가운데 원, 다섯 자리 */
export const RING_R = 0.3;
export const RING_NODES = 5;
export const ringXY = (a: number, rad: number): [number, number] => [0.5 + Math.cos(a) * rad, 0.5 + Math.sin(a) * rad * ART_ASPECT * 0.98];

const gaussK = (u: number) => Math.exp(-0.5 * u * u);
/** 분포 곡선: 이번 학기(now)와 직전 학기 수준(prev)을 6주 시간축 위 G개 점으로. 높이는 now의 최댓값으로 나눈 0~1 */
export function signalCurves(ps: Particle[], G = 240, h = 0.075) {
  const an = ps.filter((p) => p.leaf === ANOMALY_LEAF);
  const other = an.filter((p) => p.week !== HOT_WEEK).length / (WEEKS - 1);
  const hotBase = an.filter((p) => p.week === HOT_WEEK && !p.spike).length;
  const hotW = hotBase ? Math.min(1, other / hotBase) : 1;
  const now = new Float32Array(G);
  const prev = new Float32Array(G);
  for (let g = 0; g < G; g++) {
    const x = ((g + 0.5) / G) * WEEKS;
    let a = 0;
    let b = 0;
    for (const p of an) {
      const k = gaussK((x - p.tt) / h);
      a += k;
      if (!p.spike) b += k * (p.week === HOT_WEEK ? hotW : 1);
    }
    now[g] = a;
    prev[g] = b;
  }
  const m = Math.max(1e-6, ...now);
  for (let g = 0; g < G; g++) { now[g] /= m; prev[g] /= m; }
  return { now, prev, G };
}
const sampleCurve = (c: Float32Array, weeks: number) => {
  const f = (weeks / WEEKS) * c.length - 0.5;
  const i = Math.max(0, Math.min(c.length - 1, Math.floor(f)));
  const j = Math.min(c.length - 1, i + 1);
  const t = Math.max(0, Math.min(1, f - i));
  return c[i] + (c[j] - c[i]) * t;
};

/** n개 입자(문장)를 만든다. 성취 항목별 개수는 오늘 수집 비율(CASE_NODES.count)을 따른다 */
export function buildParticles(n: number = TODAY_TOTAL, seed = 7): Particle[] {
  const r = rng(seed);
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  const counts = LEAVES.map((l) => l.count ?? 0);
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const leaf = pickWeighted(r, counts);
    const isAnomaly = leaf === ANOMALY_LEAF;
    const week = isAnomaly ? pickWeighted(r, WEEK_WEIGHTS) : Math.floor(r() * WEEKS);
    // 이상 항목 문장의 시각: 주마다 강의가 있는 한가운데에 많고, 3주차 일부는 13:25–14:40 구간에 몰린다
    const spike = isAnomaly && week === HOT_WEEK && r() < SPIKE.share;
    const off = spike ? SPIKE.at + gauss() * SPIKE.sd * 1.6 : 0.5 + gauss() * 0.3;
    const tt = isAnomaly ? week + Math.max(0.03, Math.min(0.97, off)) : -1;
    // 활동 종류: 몰린 구간은 시청(멈춤·되감기)과 응답(오답)이 많다
    const verb = spike ? pickWeighted(r, [55, 32, 3, 10]) : pickWeighted(r, [45, 25, 15, 15]);
    const evidence = spike && verb <= 1;
    const node = LEAVES[leaf];
    const a = r() * Math.PI * 2;
    const rr = Math.pow(r(), 0.55);
    const T: [number, number] = [node.x + Math.cos(a) * rr * LEAF_R, node.y + Math.sin(a) * rr * 0.05];
    let G: [number, number];
    if (r() < 0.5) G = [r(), 0.04 + r() * 0.92];
    else {
      const c = NEBULA[Math.floor(r() * NEBULA.length)];
      G = [c[0] + gauss() * 0.2, c[1] + gauss() * 0.26];
    }
    const z = Math.pow(r(), 1.35);
    out.push({ verb, leaf, week, evidence, delay: r(), phase: r() * Math.PI * 2, curve: (r() - 0.5) * 0.5, z, G, ink: -1, tt, spike, R: [0, 0], T, B: [0, 0], D: [0, 0], L: [0, 0], La: [0, 0] });
  }
  // 기록 칸: 칸마다 정해진 수(cap)만큼 가까운(밝은) 문장이 채워진 길이 안에 앉는다. 줄 순서대로 채워지도록 delay를 줄 번호에 맞춘다
  const byNear = out.map((p, i) => i).sort((i, j) => out[j].z - out[i].z);
  let k = 0;
  LEDGER.rows.forEach((row, ri) => {
    row.pills.forEach((pill, si) => {
      for (let t = 0; t < pill.cap; t++) {
        const p = out[byNear[k++]];
        p.ink = ri * 4 + si;
        p.R = [pill.x + pill.w * pill.fill * (0.06 + 0.88 * ((t + 0.5) / pill.cap)) + (r() - 0.5) * 0.003, row.y + (r() - 0.5) * LEDGER.pillH * 0.4];
        p.delay = Math.min(1, ri / LEDGER.rows.length + si * 0.04 + r() * 0.08);
        p.z = Math.max(p.z, 0.45 + r() * 0.55);
      }
    });
  });
  // 분포 그래프: 이상 항목 문장을 일어난 시각에 놓고, 그 시각의 밀도 곡선 아래에 흩는다(위쪽 가장자리가 곡선을 그린다)
  const { now } = signalCurves(out);
  out.forEach((p) => {
    if (p.leaf !== ANOMALY_LEAF) { p.B = p.T; return; }
    const h = sampleCurve(now, p.tt);
    p.B = [chartX(p.tt) + (r() - 0.5) * 0.004, CHART.base - Math.pow(r(), 0.7) * (CHART.base - CHART.top) * h];
  });
  // 근거: 교수자 화면의 이상 신호 알림 왼쪽으로 한 줄기로 흘러든다. 나머지는 체계 자리에서 흐리게
  out.forEach((p) => {
    if (p.evidence) p.D = [D_CENTER[0] - 0.14 * Math.pow(r(), 0.7), D_CENTER[1] + (r() - 0.5) * 0.018 * ART_ASPECT];
    else p.D = p.T;
  });
  // 선순환 고리: 그림 칸 가운데를 고르게 두르는 원(이름표 자리는 HTML 점으로 표시)
  out.forEach((p, i) => {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.05;
    const rad = RING_R + (r() - 0.5) * 0.035;
    p.La = [a, rad];
    p.L = ringXY(a, rad);
  });
  return out;
}

/** 장면별 배치: 1 성운, 2 기록 행, 3 체계, 4 막대, 5 근거, 6 고리 */
export const LAYOUT_BY_SCENE = ['G', 'R', 'T', 'B', 'D', 'L'] as const;
export type LayoutKey = (typeof LAYOUT_BY_SCENE)[number];
/** 다른 기준의 좌표를 그림 칸 기준으로: 칸 좌표 = x0 + 좌표 × sx */
export interface BoxMap { x0: number; y0: number; sx: number; sy: number }
export const IDENTITY: BoxMap = { x0: 0, y0: 0, sx: 1, sy: 1 };
/** 그릴 때의 조건: 근거 묶음 옮김, 무대·기록 칸 좌표, 흐른 시간(움직임 멈춤이면 멈춘다) */
export interface PlaceEnv {
  shift?: readonly [number, number];
  stage?: BoxMap;
  ledger?: BoxMap;
  chart?: BoxMap;
  time?: number;
}

/** 배치별 밝기(0이면 보이지 않음) */
export function alphaOf(p: Particle, k: LayoutKey): number {
  switch (k) {
    case 'G':
      return 0.2 + p.z * 0.45;
    case 'R':
      return p.ink >= 0 ? 0.55 + p.z * 0.4 : 0.1 + p.z * 0.14;
    case 'T':
      return 0.85;
    case 'B':
      return p.leaf === ANOMALY_LEAF ? (p.spike ? 1 : 0.62) : 0.012;
    case 'D':
      return p.evidence ? 1 : 0.012;
    case 'L':
      return 0.4;
  }
}
/** 배치별 크기(그림 칸 너비의 비율로, 그릴 때 px로) */
export function sizeOf(p: Particle, k: LayoutKey): number {
  switch (k) {
    case 'G':
      return p.z > 0.9 ? 1.9 + (p.z - 0.9) * 8 : 0.45 + p.z * 0.9;
    case 'R':
      return p.ink >= 0 ? 0.85 + p.z * 0.6 : 0.4 + p.z * 0.6;
    case 'B':
      return p.leaf === ANOMALY_LEAF ? (p.spike ? 1.25 : 1) : 1;
    case 'D':
      return p.evidence ? 1.3 : 1;
    default:
      return 1;
  }
}

/** 부드러운 가감속(5차: 양 끝이 더 평평해 착지감이 크다) */
export const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** 흘러 들어올 때(장면 2→3) 거치는 점: 체계의 뿌리(CFDocument) */
const ROOT = CASE_NODES[0];
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
/**
 * 장면 i→i+1 사이 입자별 진행(0~1). 한 전환(소수부 f) 안의 순서:
 * f .30–.45 앞 장면 글이 빠짐 → f .45–.90 입자가 옮겨 감(입자마다 조금씩 늦게) → f .72–.90 다음 장면 글이 들어옴.
 * 장면 1→2만 기록 행이 줄마다 차오르는 시간에 맞춰 더 일찍, 더 길게 옮겨 간다.
 */
export const progress = (p: Particle, s: number) => {
  const i = Math.floor(s);
  const f = s - i;
  if (i === 0) return ease(clamp01((f - 0.3 - p.delay * 0.35) / 0.35));
  return ease(clamp01((f - 0.45 - p.delay * 0.15) / 0.3));
};

/**
 * 장면 값 s(0~5, 장면 사이는 소수)에서 입자의 자리·밝기·크기·진행. 캔버스와 미리 그린 그림이 같은 규칙을 쓴다.
 * 다음 장면으로 넘어가는 구간(소수부 0.3~1.0)에서 입자마다 순서(delay)를 두고, 휘어진 길(curve)로 옮겨 간다.
 * 결과: [x, y(그림 칸 기준), 밝기, 크기, 진행(0~1)]
 */
export function place(p: Particle, s: number, out: Float32Array | number[] = [0, 0, 0, 0, 0], env: PlaceEnv = {}) {
  const st = env.stage ?? IDENTITY;
  const lg = env.ledger ?? IDENTITY;
  const ch = env.chart ?? IDENTITY;
  const time = env.time ?? 0;
  const n = LAYOUT_BY_SCENE.length - 1;
  const i = Math.max(0, Math.min(n, Math.floor(s)));
  const j = Math.min(n, i + 1);
  const ka = LAYOUT_BY_SCENE[i];
  const kb = LAYOUT_BY_SCENE[j];
  const t = ka === kb ? 0 : progress(p, s);
  const pos = (k: LayoutKey): [number, number] => {
    switch (k) {
      case 'G': {
        // 떠다님: 먼 별일수록 조금 움직인다(움직임 멈춤이면 time이 멈춘다)
        const dx = Math.sin(time * 0.21 + p.phase) * 0.004 * (0.4 + p.z);
        const dy = Math.cos(time * 0.17 + p.phase * 1.3) * 0.005 * (0.4 + p.z);
        return [st.x0 + (p.G[0] + dx) * st.sx, st.y0 + (p.G[1] + dy) * st.sy];
      }
      case 'R': {
        if (p.ink >= 0) return [lg.x0 + p.R[0] * lg.sx, lg.y0 + p.R[1] * lg.sy];
        // 기록에 앉지 않은 문장은 성운 자리에서 바깥으로 조금 물러나 흐려진다
        const gx = 0.5 + (p.G[0] - 0.5) * 1.08;
        const gy = 0.5 + (p.G[1] - 0.5) * 1.08;
        return [st.x0 + gx * st.sx, st.y0 + gy * st.sy];
      }
      case 'B':
        return p.leaf === ANOMALY_LEAF ? [ch.x0 + p.B[0] * ch.sx, ch.y0 + p.B[1] * ch.sy] : p.T;
      case 'D':
        return p.evidence && env.shift ? [p.D[0] + env.shift[0], p.D[1] + env.shift[1]] : p.D;
      case 'L':
        return ringXY(p.La[0] + time * 0.035, p.La[1]);
      default:
        return p[k];
    }
  };
  let a = pos(ka);
  let b = pos(kb);
  // 사라지기만 하는 입자는 제자리에서 흐려지고(앞 장면 글과 함께), 나타나기만 하는 입자는 도착할 자리에서 밝아진다.
  // 보이지 않는 채로 화면을 가로지르는 길(꼬리)이 생기지 않게.
  const aA = alphaOf(p, ka);
  const aB = alphaOf(p, kb);
  const fadeOut = ka !== kb && aB < 0.05 && aA >= 0.05;
  const fadeIn = ka !== kb && aA < 0.05 && aB >= 0.05;
  if (fadeOut) b = a;
  if (fadeIn) a = b;
  let cx: number;
  let cy: number;
  if (ka === 'R' && kb === 'T') {
    // 기록 칸 → 뿌리(CFDocument) 근처 → 성취 항목
    cx = ROOT.x + 0.06;
    cy = ROOT.y + (a[1] - 0.5) * 0.25;
  } else {
    // 곧은 선 대신 입자마다 조금씩 다르게 휘는 길(시작·도착 중점에서 법선 방향으로)
    cx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * p.curve;
    cy = (a[1] + b[1]) / 2 + (b[0] - a[0]) * p.curve;
  }
  const u = 1 - t;
  out[0] = u * u * a[0] + 2 * u * t * cx + t * t * b[0];
  out[1] = u * u * a[1] + 2 * u * t * cy + t * t * b[1];
  const f = s - i;
  if (fadeOut) out[2] = aA * (1 - smooth01((f - 0.3) / 0.15));
  else if (fadeIn) out[2] = aB * smooth01((f - 0.72) / 0.18);
  else out[2] = aA + (aB - aA) * t;
  out[3] = sizeOf(p, ka) + (sizeOf(p, kb) - sizeOf(p, ka)) * t;
  out[4] = fadeOut || fadeIn ? 0 : t;
  return out;
}
