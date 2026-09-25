/**
 * 미리 그린 그림(기본 층): 데이터 아트 모델(story-data.ts)을 빌드 때 SVG로 그린다.
 * 움직임 줄이기·저전력·JS 없음·폰에서 이 그림만으로 이야기가 완결된다. 그림 속 글자는 없다(이름표는 HTML).
 */
import { buildParticles, CASE_NODES, VERBS, VERB_COLOR, ANOMALY_LEAF, HOT_WEEK, GALAXY, galaxy, alphaOf, sizeOf, type LayoutKey } from './story-data';

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

/** 장면 1: 흩어진 학습의 순간들(은하, 회전 0). 주인공 점과 이름표는 HTML */
export function galaxySvg() {
  const ps = buildParticles(2000, 7).filter((p) => !p.hero);
  const cs = VERBS.map((v, vi) => {
    const c = ps
      .filter((p) => p.verb === vi)
      .map((p) => {
        const [x, y, d] = galaxy(p, 0, 1.6);
        // 폰의 작은 그림에서도 보이도록 WebGL 층보다 밝고 크게
        const a = (0.25 + (p.mag - 0.5) * 0.9) * (0.5 + 0.5 * d);
        return `<circle cx="${f((x - GALAXY.cx + 0.5) * W)}" cy="${f((y - GALAXY.cy + 0.5) * H)}" r="${(3 + p.mag * 3).toFixed(1)}" opacity="${Math.min(1, a).toFixed(2)}"/>`;
      })
      .join('');
    return `<g fill="${VERB_COLOR[v]}">${c}</g>`;
  }).join('');
  return head() + cs + '</svg>';
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
