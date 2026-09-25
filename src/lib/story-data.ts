/**
 * 오프닝 여섯 장면의 데이터 아트 모델(CLAUDE.md '데이터 아트는 진짜 데이터 구조로만').
 * - 입자 하나 = xAPI Statement 하나(누가·무엇을·어느 성취 항목·몇 주차)
 * - 입자가 모이는 자리 = 1EdTech CASE 성취 항목(학습성과)
 * - 색 = 활동 종류(시청·응답·제출·질문)
 * 시연 데이터는 docs/source/mockups/lrs-event-store-anomaly.html(생활경제와 금융, 3주차 이상 신호)과 같다.
 *
 * 같은 씨앗값으로 언제나 같은 모양을 만든다. 빌드 때 미리 그린 그림(SVG, src/pages/art/*),
 * 캔버스, WebGL이 모두 이 모듈을 쓰므로 세 층이 같은 그림을 그린다.
 * 좌표는 16:10 그림 칸 기준(x 0~1, y 0~1).
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
  S: [number, number]; // 흘러 들어오기 전(그림 칸 왼쪽 밖)
  T: [number, number]; // 성취 항목 자리(장면 3)
  B: [number, number]; // 주차별 막대(장면 4, 이상 항목만)
  D: [number, number]; // 근거 묶음(장면 5)
  L: [number, number]; // 선순환 고리(장면 6)
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
    // 흐름: 활동 종류마다 한 줄기로 들어온다
    const S: [number, number] = [-0.08 - r() * 0.5, 0.22 + verb * 0.18 + (r() - 0.5) * 0.12];
    out.push({ verb, leaf, week, evidence, delay: r(), phase: r() * Math.PI * 2, S, T, B: [0, 0], D: [0, 0], L: [0, 0] });
  }
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
  // 선순환 고리: 그림을 두르는 원(16:10 칸에서 둥글게 보이도록 세로 반지름을 늘린다)
  out.forEach((p, i) => {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.05;
    const rad = 0.47 + (r() - 0.5) * 0.03;
    p.L = [0.5 + Math.cos(a) * rad, 0.5 + Math.sin(a) * rad * ART_ASPECT * 0.98];
  });
  return out;
}

/** 장면별 배치 순서: 장면 1·2는 흘러 들어오기 전, 3 체계, 4 막대, 5 근거, 6 고리 */
export const LAYOUT_BY_SCENE = ['S', 'S', 'T', 'B', 'D', 'L'] as const;
export type LayoutKey = (typeof LAYOUT_BY_SCENE)[number];

/** 배치별 밝기(0이면 보이지 않음) */
export function alphaOf(p: Particle, k: LayoutKey): number {
  switch (k) {
    case 'S':
      return 0;
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
  return 1;
}

/** 부드러운 가감속 */
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 흘러 들어올 때(장면 2→3) 거치는 점: 체계의 뿌리(CFDocument) */
const ROOT = CASE_NODES[0];
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * 장면 값 s(0~5, 장면 사이는 소수)에서 입자의 자리·밝기·크기. 캔버스·WebGL(셰이더)이 같은 규칙을 쓴다.
 * shift: 근거 묶음(D)을 화면의 신호 알림 쪽으로 옮기는 양(그림 칸 비율).
 * 다음 장면으로 넘어가는 구간(소수부 0.3~1.0)에서 입자마다 순서(delay)를 두고 옮겨 가, 흐름처럼 보인다.
 */
export function place(p: Particle, s: number, out: Float32Array | number[] = [0, 0, 0, 0], shift?: readonly [number, number]) {
  const n = LAYOUT_BY_SCENE.length - 1;
  const i = Math.max(0, Math.min(n, Math.floor(s)));
  const j = Math.min(n, i + 1);
  const ka = LAYOUT_BY_SCENE[i];
  const kb = LAYOUT_BY_SCENE[j];
  const t = ka === kb ? 0 : ease(clamp01((s - i - 0.3 - p.delay * 0.35) / 0.35));
  const moved = (k: LayoutKey) => (k === 'D' && p.evidence && shift ? [p.D[0] + shift[0], p.D[1] + shift[1]] : p[k]);
  const a = moved(ka);
  const b = moved(kb);
  let x: number;
  let y: number;
  if (ka === 'S' && kb === 'T') {
    // 이차 베지어: 왼쪽 밖 → 뿌리 근처 → 성취 항목
    const cx = ROOT.x + 0.06;
    const cy = ROOT.y + (a[1] - 0.5) * 0.25;
    const u = 1 - t;
    x = u * u * a[0] + 2 * u * t * cx + t * t * b[0];
    y = u * u * a[1] + 2 * u * t * cy + t * t * b[1];
  } else {
    x = a[0] + (b[0] - a[0]) * t;
    y = a[1] + (b[1] - a[1]) * t;
  }
  out[0] = x;
  out[1] = y;
  out[2] = alphaOf(p, ka) + (alphaOf(p, kb) - alphaOf(p, ka)) * t;
  out[3] = sizeOf(p, ka) + (sizeOf(p, kb) - sizeOf(p, ka)) * t;
  return out;
}
