/**
 * 미리 그린 그림(기본 층): 데이터 아트 모델(story-data.ts)을 빌드 때 SVG로 그린다.
 * 움직임 줄이기·저전력·JS 없음·폰에서 이 그림만으로 이야기가 완결된다. 그림 속 글자는 없다(이름표는 HTML).
 */
import { buildParticles, signalCurves, chartX, CASE_NODES, CHART, SPIKE, VERBS, VERB_COLOR, ANOMALY_LEAF, HOT_WEEK, LEDGER, LEDGER_ASPECT, ROW_COLOR, alphaOf, sizeOf, type LayoutKey } from './story-data';

const W = 1600;
const H = 1000;
const N = 900;

function head(extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${extra}`;
}
const f = (n: number) => Math.round(n * 10) / 10;

function dots(layout: LayoutKey) {
  const ps = buildParticles(N, 7);
  // 활동 종류별로 묶어 파일을 줄인다
  return VERBS.map((v, vi) => {
    const cs = ps
      .filter((p) => p.verb === vi && alphaOf(p, layout) > 0.06)
      .map((p) => {
        const [x, y] = p[layout];
        const a = alphaOf(p, layout);
        const r = 3.2 * sizeOf(p, layout);
        return `<circle cx="${f(x * W)}" cy="${f(y * H)}" r="${r}"${a < 0.99 ? ` opacity="${a.toFixed(2)}"` : ''}/>`;
      })
      .join('');
    return `<g fill="${VERB_COLOR[v]}" filter="url(#glow)">${cs}</g>`;
  }).join('');
}

const DEFS = `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

/** CASE 체계의 가지와 마디 */
function branchesAndNodes() {
  const byId = new Map(CASE_NODES.map((n) => [n.id, n]));
  const branches = CASE_NODES.filter((n) => n.parent)
    .map((n) => {
      const p = byId.get(n.parent!)!;
      const mx = ((p.x + n.x) / 2) * W;
      return `<path d="M${f(p.x * W)} ${f(p.y * H)}C${f(mx)} ${f(p.y * H)} ${f(mx)} ${f(n.y * H)} ${f(n.x * W)} ${f(n.y * H)}"/>`;
    })
    .join('');
  const nodes = CASE_NODES.map((n) => `<circle cx="${f(n.x * W)}" cy="${f(n.y * H)}" r="${n.count ? 5 : 7}"/>`).join('');
  return { lines: `<g fill="none" stroke="#b9a6ff" stroke-opacity=".35" stroke-width="2">${branches}</g>`, nodes: `<g fill="#eef1fb">${nodes}</g>` };
}

/** 장면 3: CASE 체계 가지 + 성취 항목에 모인 문장 */
export function treeSvg() {
  const { lines, nodes } = branchesAndNodes();
  return head(DEFS) + lines + dots('T') + nodes + '</svg>';
}

/** 장면 3 연출 층: 입자는 캔버스·WebGL이 그리고, 가지와 마디만 */
export function linesSvg() {
  const { lines, nodes } = branchesAndNodes();
  return head() + lines + nodes + '</svg>';
}

/** 장면 4 그래프 칸의 가로세로 비(이상 탐지 화면 안) */
export const CHART_ASPECT = 2.9;
/**
 * 장면 4: '위험요인 비교' 문장을 일어난 시각에 놓은 분포(3주차 13:25–14:40 구간이 솟는다).
 * 직전 학기 수준은 점선, 이번 학기는 선. 글자는 없다(주차·범례는 HTML).
 */
export function signalSvg() {
  const SW = 1450;
  const SH = Math.round(SW / CHART_ASPECT);
  const all = buildParticles();
  const ps = all.filter((p) => p.leaf === ANOMALY_LEAF);
  const { now, prev, G } = signalCurves(all);
  const X = (u: number) => f(u * SW);
  const Y = (v: number) => f(v * SH);
  const path = (c: Float32Array) => Array.from(c, (v, g) => `${g ? 'L' : 'M'}${X(chartX(((g + 0.5) / G) * 6))} ${Y(CHART.base - v * (CHART.base - CHART.top))}`).join('');
  const sx = X(chartX(HOT_WEEK + SPIKE.at));
  const glow = `<radialGradient id="sg" cx="${sx}" cy="${Y(CHART.base)}" r="${f(SH * 0.9)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#e930b0" stop-opacity=".24"/><stop offset="1" stop-color="#e930b0" stop-opacity="0"/></radialGradient>`;
  const cs = VERBS.map((v, vi) => {
    const c = ps
      .filter((p) => p.verb === vi)
      .map((p) => `<circle cx="${X(p.B[0])}" cy="${Y(p.B[1])}" r="${(3.6 * sizeOf(p, 'B')).toFixed(1)}" opacity="${alphaOf(p, 'B').toFixed(2)}"/>`)
      .join('');
    return `<g fill="${VERB_COLOR[v]}" filter="url(#glow)">${c}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}"><defs>${glow}<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    + `<rect x="0" y="0" width="${SW}" height="${SH}" fill="url(#sg)"/>`
    + `<line x1="${X(CHART.x0)}" x2="${X(CHART.x1)}" y1="${Y(CHART.base) + 1}" y2="${Y(CHART.base) + 1}" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>`
    + cs
    + `<path d="${path(prev)}" fill="none" stroke="#a3b1ff" stroke-opacity=".65" stroke-width="2.4" stroke-dasharray="7 8"/>`
    + `<path d="${path(now)}" fill="none" stroke="#eef1fb" stroke-opacity=".35" stroke-width="2"/>`
    + '</svg>';
}

/** 장면 2: 기록 행(누가 · ~하다 · 무엇을 · 부가 정보). 칸마다 심볼과 같은 네 줄 막대, 줄 색은 브랜드 그라디언트 네 단계 */
export function ledgerSvg() {
  const LW = 1600;
  const LH = Math.round(LW / LEDGER_ASPECT);
  const bh = LEDGER.barH * LH;
  const ps = buildParticles().filter((p) => p.ink >= 0);
  const bars = LEDGER.rows.map((row) => {
    const y = row.y * LH;
    const c = ROW_COLOR[row.bars[0].row];
    return row.bars.map((b) => `<rect x="${f(b.x * LW)}" y="${f(y - bh / 2)}" width="${f(b.w * LW)}" height="${f(bh)}" rx="${f(bh / 2)}" fill="${c}" fill-opacity=".5" stroke="${c}" stroke-opacity=".9" stroke-width="1.5"/>`).join('');
  }).join('');
  const dots = ps.map((p) => `<circle cx="${f(p.R[0] * LW)}" cy="${f(p.R[1] * LH)}" r="${(2 + p.z * 1.4).toFixed(1)}" fill="#fff" fill-opacity="${(0.55 + p.z * 0.35).toFixed(2)}"/>`).join('');
  const defs = `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LW} ${LH}" width="${LW}" height="${LH}">${defs}${bars}<g filter="url(#glow)">${dots}</g></svg>`;
}

/** 장면 6: 모든 문장이 모인 선순환 고리 */
export function ringSvg() {
  const ps = buildParticles(900, 7);
  const cs = VERBS.map((v, vi) => {
    const c = ps.filter((p) => p.verb === vi).map((p) => `<circle cx="${f(p.L[0] * W)}" cy="${f(p.L[1] * H)}" r="3"/>`).join('');
    return `<g fill="${VERB_COLOR[v]}" opacity=".7" filter="url(#glow)">${c}</g>`;
  }).join('');
  return head(DEFS) + cs + '</svg>';
}
