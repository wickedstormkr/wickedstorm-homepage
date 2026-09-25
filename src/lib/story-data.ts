/**
 * 오프닝 여섯 장면의 데이터 아트 모델(CLAUDE.md '데이터 아트는 진짜 데이터 구조로만').
 * - 입자 하나 = xAPI Statement 하나(누가·무엇을·어느 성취 항목·몇 주차)
 * - 입자가 모이는 자리 = 1EdTech CASE 성취 항목(학습성과)
 * - 색 = 활동 종류(시청·응답·제출·질문)
 * 시연 데이터는 docs/source/mockups/lrs-event-store-anomaly.html(생활경제와 금융, 3주차 이상 신호)과 같다.
 *
 * 같은 씨앗값으로 언제나 같은 모양을 만든다. 빌드 때 미리 그린 그림(SVG, src/pages/art/*),
 * 캔버스, WebGL이 모두 이 모듈을 쓰므로 세 층이 같은 그림을 그린다.
 * 좌표: 장면 1·2(G 별밭, F 흐름)는 무대 전체 기준(0~1), 장면 3~6은 16:10 그림 칸 기준(x 0~1, y 0~1).
 * 무대 기준 좌표는 그릴 때 place()의 stage로 그림 칸 기준으로 바꾼다.
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
  { id: 'c1', parent: 'major', x: 0.44, y: 0.2 },
  { id: 'o1', parent: 'c1', x: 0.7, y: 0.11, count: 218 },
  { id: 'o2', parent: 'c1', x: 0.7, y: 0.29, count: 294, anomaly: true },
  { id: 'c2', parent: 'major', x: 0.44, y: 0.5 },
  { id: 'o3', parent: 'c2', x: 0.7, y: 0.41, count: 306 },
  { id: 'o4', parent: 'c2', x: 0.7, y: 0.59, count: 190 },
  { id: 'c3', parent: 'major', x: 0.44, y: 0.8 },
  { id: 'o5', parent: 'c3', x: 0.7, y: 0.71, count: 204 },
  { id: 'o6', parent: 'c3', x: 0.7, y: 0.89, count: 162 },
];
export const LEAVES = CASE_NODES.filter((n) => n.count);
export const TODAY_TOTAL = LEAVES.reduce((a, n) => a + (n.count ?? 0), 0); // 1,374
export const ANOMALY_LEAF = LEAVES.findIndex((n) => n.anomaly);

/** '위험요인 비교' 항목의 주차별 문장 비중(3주차 급증). 장면 4의 막대 */
export const WEEK_WEIGHTS = [26, 34, 86, 30, 24, 20];
export const WEEKS = WEEK_WEIGHTS.length;
export const HOT_WEEK = 2; // 0부터 센 3주차

/** 흐름(장면 2) 줄기의 위치(무대 기준 y): 장면 글과 제품 화면 아래, 장면 목록 위 */
export const FLOW_Y = 0.755;
export const FLOW_GAP = 0.032;

/** 막대(장면 4) 배치: 그림 칸 왼쪽 절반 */
export const BARS = { x0: 0.07, step: 0.075, width: 0.05, base: 0.8, maxH: 0.56 };

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

export interface Particle {
  verb: number; // VERBS 번호
  leaf: number; // LEAVES 번호
  week: number; // 0~5
  evidence: boolean; // 장면 5에서 교수자 화면으로 가는 근거 문장
  delay: number; // 0~1 흐름 순서
  phase: number; // 떠다님 위상
  hero: boolean; // 이야기의 주인공: 박서연의 구간 퀴즈 3번 응답(장면 1 이름표, 장면 2 문장)
  curve: number; // 장면 사이를 옮겨 갈 때 휘는 정도(-0.25~0.25)
  mag: number; // 별밭에서의 밝기·크기(0.5~1.6)
  Gp: [number, number, number]; // 장면 1 은하: 반지름·각도·높이(도는 원반 위, 그릴 때 투영)
  G: [number, number]; // 장면 1을 회전 0으로 투영한 자리(무대 기준, 미리 그린 그림용)
  F: [number, number]; // 장면 2 흐름: 활동 종류마다 한 줄기로 늘어선 표준 문장(무대 기준)
  T: [number, number]; // 성취 항목 자리(장면 3)
  B: [number, number]; // 주차별 막대(장면 4, 이상 항목만)
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

/** n개 입자(문장)를 만든다. 성취 항목별 개수는 오늘 수집 비율(CASE_NODES.count)을 따른다 */
export function buildParticles(n: number, seed = 7): Particle[] {
  const r = rng(seed);
  const counts = LEAVES.map((l) => l.count ?? 0);
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const leaf = pickWeighted(r, counts);
    const isAnomaly = leaf === ANOMALY_LEAF;
    const week = isAnomaly ? pickWeighted(r, WEEK_WEIGHTS) : Math.floor(r() * WEEKS);
    // 활동 종류: 이상 구간(3주차)은 시청(멈춤·되감기)과 응답(오답)이 많다
    const verb = isAnomaly && week === HOT_WEEK ? pickWeighted(r, [55, 30, 5, 10]) : pickWeighted(r, [45, 25, 15, 15]);
    const evidence = isAnomaly && week === HOT_WEEK && verb <= 1;
    const node = LEAVES[leaf];
    const a = r() * Math.PI * 2;
    const rr = Math.pow(r(), 0.55);
    const T: [number, number] = [node.x + Math.cos(a) * rr * LEAF_R, node.y + Math.sin(a) * rr * 0.05];
    // 은하: 두 팔을 가진 원반. 가운데가 촘촘하고 바깥으로 갈수록 성기다
    const gr = Math.pow(r(), 0.62);
    const arm = (i % 2) * Math.PI;
    const ga = arm + gr * 4.6 + (r() - 0.5) * (0.9 + gr * 0.8);
    const gh = (r() - 0.5) * 0.16 * (1.1 - gr);
    const Gp: [number, number, number] = [gr * (0.92 + r() * 0.16), ga, gh];
    const mag = 0.5 + Math.pow(r(), 3) * 1.1;
    // 흐름: 화면 아래쪽에 활동 종류별 네 줄기(위에서부터 시청·응답·제출·질문)
    const F: [number, number] = [r() * 1.08 - 0.04, FLOW_Y + verb * FLOW_GAP + (r() - 0.5) * 0.01];
    out.push({ verb, leaf, week, evidence, hero: false, curve: (r() - 0.5) * 0.5, delay: r(), phase: r() * Math.PI * 2, mag, Gp, G: [0, 0], F, T, B: [0, 0], D: [0, 0], L: [0, 0], La: [0, 0] });
  }
  // 주인공: 첫 입자를 '위험요인 비교' 항목·3주차·응답(오답)·근거 문장으로 정한다
  {
    const h = out[0];
    const node = LEAVES[ANOMALY_LEAF];
    Object.assign(h, { hero: true, verb: 1, leaf: ANOMALY_LEAF, week: HOT_WEEK, evidence: true, mag: 1.6, delay: 0.5, curve: 0.18 });
    h.T = [node.x, node.y];
    h.F = [0.5, FLOW_Y + FLOW_GAP];
  }
  out.forEach((p) => { const g = galaxy(p, 0, 1.6); p.G = [g[0], g[1]]; });
  // 막대: 이상 항목 문장을 주차별로 쌓는다(칸 채우기)
  const anomalous = out.filter((p) => p.leaf === ANOMALY_LEAF);
  const perWeek = Array.from({ length: WEEKS }, () => [] as Particle[]);
  anomalous.forEach((p) => perWeek[p.week].push(p));
  // 가장 높은 막대(3주차)가 maxH를 채우도록 칸 크기를 입자 수에 맞춘다(입자가 많을수록 칸이 촘촘해진다)
  const maxCount = Math.max(1, ...perWeek.map((w) => w.length));
  const hX = BARS.maxH / ART_ASPECT; // 세로 길이를 가로 단위로
  const cellX = Math.sqrt((BARS.width * hX) / maxCount);
  const cols = Math.max(1, Math.round(BARS.width / cellX));
  const cw = BARS.width / cols;
  const ch = (BARS.maxH / Math.ceil(maxCount / cols));
  perWeek.forEach((list, w) => {
    list.forEach((p, k) => {
      const col = k % cols;
      const row = Math.floor(k / cols);
      p.B = [BARS.x0 + w * BARS.step + (col + 0.5) * cw, BARS.base - (row + 0.5) * ch];
    });
  });
  // 그 밖의 문장은 막대 장면에서 제자리(흐리게)
  out.forEach((p) => {
    if (p.leaf !== ANOMALY_LEAF) p.B = p.T;
  });
  // 근거 묶음: 교수자 화면 알림(왼쪽 위) 쪽으로 모인다. 나머지는 체계 자리에서 흐리게
  out.forEach((p) => {
    if (p.evidence) {
      const a = r() * Math.PI * 2;
      const rr = Math.sqrt(r()) * 0.035;
      p.D = [D_CENTER[0] + Math.cos(a) * rr, D_CENTER[1] + Math.sin(a) * rr * ART_ASPECT];
    } else p.D = p.T;
  });
  // 선순환 고리: 그림 칸 가운데 원. 다섯 자리(학습자·Lecognizer·Lecognizer AI·운영자·교수자) 근처가 조금 더 밝게 모인다
  out.forEach((p, i) => {
    let a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.05;
    const k = Math.round(((a + Math.PI / 2) / (Math.PI * 2)) * RING_NODES) / RING_NODES;
    const node = k * Math.PI * 2 - Math.PI / 2;
    a += (node - a) * 0.35 * r();
    const rad = RING_R + (r() - 0.5) * 0.035;
    p.La = [a, rad];
    p.L = ringXY(a, rad);
  });
  return out;
}

/** 은하(장면 1): 무대 기준 가운데·반지름(가로 기준), 원반 기울기 */
export const GALAXY = { cx: 0.68, cy: 0.54, r: 0.25, tilt: 1.12 };
/**
 * 은하 위 자리: spin만큼 돌린 원반을 기울여 원근으로 투영한다. [x, y, 깊이(0 뒤~1 앞), 원근 배율] (무대 기준)
 * ar: 무대 가로/세로 비(원반이 둥글게 보이도록)
 */
export function galaxy(p: Particle, spin: number, ar: number): [number, number, number, number] {
  const [r, a0, h] = p.Gp;
  const a = a0 + spin * (1.25 - r * 0.7);
  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;
  const ct = Math.cos(GALAXY.tilt);
  const st = Math.sin(GALAXY.tilt);
  const y2 = h * ct - z * st;
  const z2 = h * st + z * ct;
  const per = 2.6 / (2.6 - z2);
  return [GALAXY.cx + x * per * GALAXY.r, GALAXY.cy + y2 * per * GALAXY.r * ar, (z2 + 1) / 2, per];
}
/** 선순환 고리: 그림 칸 기준 가운데 원, 다섯 자리 */
export const RING_R = 0.3;
export const RING_NODES = 5;
export const ringXY = (a: number, rad: number): [number, number] => [0.5 + Math.cos(a) * rad, 0.5 + Math.sin(a) * rad * ART_ASPECT * 0.98];

/** 장면별 배치: 1 별밭, 2 흐름, 3 체계, 4 막대, 5 근거, 6 고리 */
export const LAYOUT_BY_SCENE = ['G', 'F', 'T', 'B', 'D', 'L'] as const;
/** 무대 기준 배치(G·F)를 그림 칸 기준으로 바꾸는 값: 칸 좌표 = x0 + 무대 좌표 × sx */
export interface StageMap { x0: number; y0: number; sx: number; sy: number; ar: number }
export const STAGE_IS_BOX: StageMap = { x0: 0, y0: 0, sx: 1, sy: 1, ar: 1.6 };
/** 그릴 때의 조건: 근거 묶음 옮김, 무대 좌표, 흐른 시간(움직임 멈춤이면 멈춘다), 주인공이 설 자리(무대 기준) */
export interface PlaceEnv {
  shift?: readonly [number, number];
  stage?: StageMap;
  time?: number;
  heroG?: readonly [number, number];
  heroF?: readonly [number, number];
}
export type LayoutKey = (typeof LAYOUT_BY_SCENE)[number];

/** 배치별 밝기(0이면 보이지 않음) */
export function alphaOf(p: Particle, k: LayoutKey): number {
  switch (k) {
    case 'G':
      // 대부분은 흐린 먼지, 몇몇만 밝은 별
      return p.hero ? 1 : 0.1 + (p.mag - 0.5) * 0.72;
    case 'F':
      return p.hero ? 1 : 0.7;
    case 'T':
      return 0.85;
    case 'B':
      return p.leaf === ANOMALY_LEAF ? (p.week === HOT_WEEK ? 1 : 0.6) : 0.05;
    case 'D':
      return p.evidence ? 1 : 0.05;
    case 'L':
      return 0.35;
  }
}
export function sizeOf(p: Particle, k: LayoutKey): number {
  if (k === 'B' && p.leaf === ANOMALY_LEAF) return p.week === HOT_WEEK ? 1.5 : 1.2;
  if (k === 'D' && p.evidence) return 1.3;
  if (p.hero) return k === 'G' || k === 'F' ? 4.2 : 2;
  if (k === 'G') return 0.55 + p.mag * 0.55;
  if (k === 'F') return 0.85;
  return 1;
}

/** 부드러운 가감속 */
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 흘러 들어올 때(장면 2→3) 거치는 점: 체계의 뿌리(CFDocument) */
const ROOT = CASE_NODES[0];
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const fract = (v: number) => v - Math.floor(v);
const smooth = (e0: number, e1: number, v: number) => { const t = clamp01((v - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/**
 * 장면 값 s(0~5, 장면 사이는 소수)에서 입자의 자리·밝기·크기. 캔버스·WebGL(셰이더)이 같은 규칙을 쓴다.
 * 다음 장면으로 넘어가는 구간(소수부 0.3~1.0)에서 입자마다 순서(delay)를 두고, 휘어진 길(curve)로 옮겨 가 흐름이 된다.
 * 결과: [x, y(그림 칸 기준), 밝기, 크기]
 */
export function place(p: Particle, s: number, out: Float32Array | number[] = [0, 0, 0, 0], env: PlaceEnv = {}) {
  const st = env.stage ?? STAGE_IS_BOX;
  const time = env.time ?? 0;
  const n = LAYOUT_BY_SCENE.length - 1;
  const i = Math.max(0, Math.min(n, Math.floor(s)));
  const j = Math.min(n, i + 1);
  const ka = LAYOUT_BY_SCENE[i];
  const kb = LAYOUT_BY_SCENE[j];
  const t = ka === kb ? 0 : ease(clamp01((s - i - 0.3 - p.delay * 0.35) / 0.35));
  const toBox = (x: number, y: number): [number, number] => [st.x0 + x * st.sx, st.y0 + y * st.sy];
  let depth = 1;
  let edge = 1;
  const pos = (k: LayoutKey): [number, number] => {
    switch (k) {
      case 'G': {
        if (p.hero && env.heroG) return toBox(env.heroG[0], env.heroG[1]);
        const g = galaxy(p, time * 0.05 + Math.min(s, 1.2) * 0.9, st.ar);
        depth = g[2];
        return toBox(g[0], g[1]);
      }
      case 'F': {
        if (p.hero && env.heroF) return toBox(env.heroF[0], env.heroF[1]);
        // 줄기를 따라 오른쪽으로 흐른다(가장자리에서 흐려지며 다시 들어온다)
        const fx = fract(p.F[0] + time * (0.012 + p.verb * 0.003));
        edge = smooth(0, 0.08, fx) * smooth(1, 0.92, fx);
        return toBox(fx, p.F[1]);
      }
      case 'D':
        return p.evidence && env.shift ? [p.D[0] + env.shift[0], p.D[1] + env.shift[1]] : p.D;
      case 'L':
        return ringXY(p.La[0] + time * 0.035, p.La[1]);
      default:
        return p[k];
    }
  };
  const a = pos(ka);
  const dA = depth; const eA = edge;
  depth = 1; edge = 1;
  const b = pos(kb);
  const dB = depth; const eB = edge;
  let cx: number;
  let cy: number;
  if (ka === 'F' && kb === 'T') {
    // 흐름 줄기 → 뿌리(CFDocument) 근처 → 성취 항목
    cx = ROOT.x + 0.06;
    cy = ROOT.y + (a[1] - 0.5) * 0.25;
  } else {
    // 곧은 선 대신 입자마다 조금씩 다르게 휘는 길
    cx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * p.curve;
    cy = (a[1] + b[1]) / 2 + (b[0] - a[0]) * p.curve;
  }
  const u = 1 - t;
  out[0] = u * u * a[0] + 2 * u * t * cx + t * t * b[0];
  out[1] = u * u * a[1] + 2 * u * t * cy + t * t * b[1];
  const va = alphaOf(p, ka) * (ka === 'G' ? 0.45 + 0.55 * dA : 1) * eA;
  const vb = alphaOf(p, kb) * (kb === 'G' ? 0.45 + 0.55 * dB : 1) * eB;
  out[2] = va + (vb - va) * t;
  out[3] = sizeOf(p, ka) + (sizeOf(p, kb) - sizeOf(p, ka)) * t;
  return out;
}
