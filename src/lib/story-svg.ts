/**
 * 미리 그린 그림(기본 층): 데이터 아트 모델(story-data.ts)을 빌드 때 SVG로 그린다.
 * 움직임 줄이기·저전력·JS 없음·폰에서 이 그림만으로 이야기가 완결된다. 그림 속 글자는 없다(이름표는 HTML).
 */
import { buildParticles, CASE_NODES, VERBS, VERB_COLOR, ANOMALY_LEAF, HOT_WEEK, LEDGER, LEDGER_ASPECT, SLOT_COLOR, alphaOf, sizeOf, type LayoutKey } from './story-data';

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

/** 장면 4: '위험요인 비교' 문장이 주차별 막대로(3주차 솟음) */
export function barsSvg() {
  const ps = buildParticles(N, 7).filter((p) => p.leaf === ANOMALY_LEAF);
  const cs = VERBS.map((v, vi) => {
    const c = ps
      .filter((p) => p.verb === vi)
      .map((p) => `<circle cx="${f(p.B[0] * W)}" cy="${f(p.B[1] * H)}" r="${(4.2 * sizeOf(p, 'B')).toFixed(1)}" opacity="${p.week === HOT_WEEK ? 1 : 0.6}"/>`)
      .join('');
    return `<g fill="${VERB_COLOR[v]}" filter="url(#glow)">${c}</g>`;
  }).join('');
  return head(DEFS) + `<line x1="${0.05 * W}" x2="${0.52 * W}" y1="${0.81 * H}" y2="${0.81 * H}" stroke="#ffffff" stroke-opacity=".18" stroke-width="2"/>` + cs + '</svg>';
}

/** 장면 1: 흩어진 학습의 순간들(성운). 가까운 별은 크고 밝게, 먼 별은 작고 흐리게 */
export function nebulaSvg() {
  const ps = buildParticles();
  const cs = VERBS.map((v, vi) => {
    const c = ps
      .filter((p) => p.verb === vi)
      .map((p) => {
        const r = p.z > 0.9 ? 6 + (p.z - 0.9) * 40 : 2 + p.z * 3.5;
        return `<circle cx="${f(p.G[0] * W)}" cy="${f(p.G[1] * H)}" r="${r.toFixed(1)}" opacity="${(0.25 + p.z * 0.6).toFixed(2)}"/>`;
      })
      .join('');
    return `<g fill="${VERB_COLOR[v]}" filter="url(#glow)">${c}</g>`;
  }).join('');
  return head(DEFS) + cs + '</svg>';
}

/** 장면 2: 다 채워진 기록 행(actor · verb · object). 가로 3.2 : 1 */
export function ledgerSvg() {
  const LW = 1600;
  const LH = Math.round(LW / LEDGER_ASPECT);
  const ph = LEDGER.pillH * LH;
  const ps = buildParticles().filter((p) => p.ink >= 0);
  const rows = LEDGER.rows.map((row) => {
    const y = row.y * LH;
    const pills = row.pills.map((pl) => {
      const c = SLOT_COLOR[pl.slot];
      return `<rect x="${f(pl.x * LW)}" y="${f(y - ph / 2)}" width="${f(pl.w * LW)}" height="${f(ph)}" rx="${f(ph / 2)}" fill="${c}" fill-opacity=".28" stroke="${c}" stroke-opacity=".85"/>`;
    }).join('');
    const hx = LEDGER.headX * LW;
    const cx = LEDGER.checkX * LW;
    return pills + `<circle cx="${f(hx)}" cy="${f(y)}" r="7" fill="url(#hg)"/><circle cx="${f(cx)}" cy="${f(y)}" r="5" fill="#a3b1ff"/><circle cx="${f(cx)}" cy="${f(y)}" r="9" fill="none" stroke="#a3b1ff" stroke-opacity=".5" stroke-width="1.5"/>`;
  }).join('');
  const dots = ps.map((p) => `<circle cx="${f(p.R[0] * LW)}" cy="${f(p.R[1] * LH)}" r="${(2.4 + p.z * 1.6).toFixed(1)}" fill="${SLOT_COLOR[p.ink % 3]}"/>`).join('');
  const defs = `<defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stop-color="#e930b0"/><stop offset=".52" stop-color="#7c4dff"/><stop offset="1" stop-color="#2f7cff"/></linearGradient><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LW} ${LH}" width="${LW}" height="${LH}">${defs}${rows}<g filter="url(#glow)">${dots}</g></svg>`;
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
