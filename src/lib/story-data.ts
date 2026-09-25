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
 * 장면 3~6은 16:10 그림 칸 기준. 그릴 때 place()가 모두 그림 칸 기준으로 바꾼다.
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
export const BARS = { x0: 0.02, step: 0.068, width: 0.046, base: 0.8, maxH: 0.56 }; // 오른쪽 54%는 이상 탐지 화면 자리(겹치지 않게)

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
 * 장면 2 기록 행: 위 세 줄은 xAPI(actor · verb · object), 아래 세 줄은 1EdTech Caliper(actor · action · object).
 * 줄마다 넷째 칸은 부가 정보(xAPI context·result, Caliper extensions·edApp·session): 시각, 기기, 세션, 재생 위치, 교육과정 맥락 등.
 * 칸 색: actor 파랑 · verb/action 보라 · object 마젠타 · 부가 정보 강조색. 좌표는 기록 칸(ledger box) 기준 0~1.
 */
export const SLOTS = ['actor', 'verb', 'object', 'extra'] as const;
export const SLOT_COLOR = ['#2f7cff', '#7c4dff', '#e930b0', '#a3b1ff'];
export interface LedgerPill { x: number; w: number; slot: number; cap: number }
export interface LedgerRow { y: number; std: 'xapi' | 'caliper'; pills: LedgerPill[] }
export interface LedgerGroup { std: 'xapi' | 'caliper'; headY: number; rows: number[] }
export const LEDGER_ASPECT = 2.6;
export const LEDGER = (() => {
  const r = rng(11);
  const px0 = 0.03;
  const px1 = 0.955;
  const gap = 0.008;
  const ys = [0.2, 0.32, 0.44, 0.7, 0.82, 0.94];
  const rows: LedgerRow[] = ys.map((y, i) => {
    const avail = px1 - px0 - 3 * gap;
    // 부가 정보 칸은 늘 넉넉하게(이야기의 핵심): 전체의 30% 안팎
    const f = [0.15 + r() * 0.05, 0.2 + r() * 0.06, 0.22 + r() * 0.06];
    const fx = 1 - f[0] - f[1] - f[2];
    const w = [...f, fx].map((v) => v * avail);
    let x = px0;
    const pills = w.map((wi, slot) => {
      const p = { x, w: wi, slot, cap: Math.max(5, Math.min(18, Math.round(wi * 58))) };
      x += wi + gap;
      return p;
    });
    return { y, std: i < 3 ? 'xapi' : 'caliper', pills } as LedgerRow;
  });
  const groups: LedgerGroup[] = [
    { std: 'xapi', headY: 0.115, rows: [0, 1, 2] },
    { std: 'caliper', headY: 0.615, rows: [3, 4, 5] },
  ];
  return { rows, groups, headX: 0.008, checkX: 0.978, pillH: 0.05 };
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
  R: [number, number]; // 장면 2 기록 칸 자리(기록 칸 기준)
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

/** 성운 덩어리(무대 기준): 균일하게 흩으면 벽지처럼 보여, 반은 덩어리 셋 둘레에 모은다 */
const NEBULA = [[0.26, 0.3], [0.78, 0.28], [0.62, 0.76]];

/** 선순환 고리: 그림 칸 기준 가운데 원, 다섯 자리 */
export const RING_R = 0.3;
export const RING_NODES = 5;
export const ringXY = (a: number, rad: number): [number, number] => [0.5 + Math.cos(a) * rad, 0.5 + Math.sin(a) * rad * ART_ASPECT * 0.98];

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
    // 활동 종류: 이상 구간(3주차)은 시청(멈춤·되감기)과 응답(오답)이 많다
    const verb = isAnomaly && week === HOT_WEEK ? pickWeighted(r, [55, 30, 5, 10]) : pickWeighted(r, [45, 25, 15, 15]);
    const evidence = isAnomaly && week === HOT_WEEK && verb <= 1;
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
    out.push({ verb, leaf, week, evidence, delay: r(), phase: r() * Math.PI * 2, curve: (r() - 0.5) * 0.5, z, G, ink: -1, R: [0, 0], T, B: [0, 0], D: [0, 0], L: [0, 0], La: [0, 0] });
  }
  // 기록 칸: 칸마다 정해진 수(cap)만큼 가까운(밝은) 문장이 앉는다. 줄 순서대로 채워지도록 delay를 줄 번호에 맞춘다
  const byNear = out.map((p, i) => i).sort((i, j) => out[j].z - out[i].z);
  let k = 0;
  LEDGER.rows.forEach((row, ri) => {
    row.pills.forEach((pill, si) => {
      for (let t = 0; t < pill.cap; t++) {
        const p = out[byNear[k++]];
        p.ink = ri * 4 + si;
        p.R = [pill.x + pill.w * (0.05 + 0.9 * ((t + 0.5) / pill.cap)) + (r() - 0.5) * 0.004, row.y + (r() - 0.5) * LEDGER.pillH * 0.45];
        p.delay = Math.min(1, ri / LEDGER.rows.length + si * 0.04 + r() * 0.08);
        p.z = Math.max(p.z, 0.45 + r() * 0.55);
      }
    });
  });
  // 막대: 이상 항목 문장을 주차별로 쌓는다(칸 채우기)
  const anomalous = out.filter((p) => p.leaf === ANOMALY_LEAF);
  const perWeek = Array.from({ length: WEEKS }, () => [] as Particle[]);
  anomalous.forEach((p) => perWeek[p.week].push(p));
  const maxCount = Math.max(1, ...perWeek.map((w) => w.length));
  const hX = BARS.maxH / ART_ASPECT;
  const cellX = Math.sqrt((BARS.width * hX) / maxCount);
  const cols = Math.max(1, Math.round(BARS.width / cellX));
  const cw = BARS.width / cols;
  const ch = BARS.maxH / Math.ceil(maxCount / cols);
  perWeek.forEach((list, w) => {
    list.forEach((p, q) => {
      const col = q % cols;
      const row = Math.floor(q / cols);
      p.B = [BARS.x0 + w * BARS.step + (col + 0.5) * cw, BARS.base - (row + 0.5) * ch];
    });
  });
  out.forEach((p) => { if (p.leaf !== ANOMALY_LEAF) p.B = p.T; });
  // 근거 묶음: 교수자 화면 알림 쪽으로 모인다. 나머지는 체계 자리에서 흐리게
  out.forEach((p) => {
    if (p.evidence) {
      const a = r() * Math.PI * 2;
      const rr = Math.sqrt(r()) * 0.035;
      p.D = [D_CENTER[0] + Math.cos(a) * rr, D_CENTER[1] + Math.sin(a) * rr * ART_ASPECT];
    } else p.D = p.T;
  });
  // 선순환 고리: 다섯 자리(Lecognizer·Lecognizer AI·운영자·교수자·학습자) 근처가 조금 더 밝게 모인다
  out.forEach((p, i) => {
    let a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.05;
    const q = Math.round(((a + Math.PI / 2) / (Math.PI * 2)) * RING_NODES) / RING_NODES;
    a += (q * Math.PI * 2 - Math.PI / 2 - a) * 0.35 * r();
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
      return p.leaf === ANOMALY_LEAF ? (p.week === HOT_WEEK ? 1 : 0.6) : 0.012;
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
      return p.leaf === ANOMALY_LEAF ? (p.week === HOT_WEEK ? 1.5 : 1.2) : 1;
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
/** 장면 i→i+1 사이 입자별 진행(0~1) */
export const progress = (p: Particle, s: number) => {
  const i = Math.floor(s);
  return ease(clamp01((s - i - 0.3 - p.delay * 0.35) / 0.35));
};

/**
 * 장면 값 s(0~5, 장면 사이는 소수)에서 입자의 자리·밝기·크기·진행. 캔버스와 미리 그린 그림이 같은 규칙을 쓴다.
 * 다음 장면으로 넘어가는 구간(소수부 0.3~1.0)에서 입자마다 순서(delay)를 두고, 휘어진 길(curve)로 옮겨 간다.
 * 결과: [x, y(그림 칸 기준), 밝기, 크기, 진행(0~1)]
 */
export function place(p: Particle, s: number, out: Float32Array | number[] = [0, 0, 0, 0, 0], env: PlaceEnv = {}) {
  const st = env.stage ?? IDENTITY;
  const lg = env.ledger ?? IDENTITY;
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
      case 'D':
        return p.evidence && env.shift ? [p.D[0] + env.shift[0], p.D[1] + env.shift[1]] : p.D;
      case 'L':
        return ringXY(p.La[0] + time * 0.035, p.La[1]);
      default:
        return p[k];
    }
  };
  const a = pos(ka);
  const b = pos(kb);
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
  out[2] = alphaOf(p, ka) + (alphaOf(p, kb) - alphaOf(p, ka)) * t;
  out[3] = sizeOf(p, ka) + (sizeOf(p, kb) - sizeOf(p, ka)) * t;
  out[4] = t;
  return out;
}
