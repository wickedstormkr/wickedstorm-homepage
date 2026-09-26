/**
 * 짧은 설명(한두 문장: 섹션 리드, 묶음 설명, 한 줄 안내)의 문장 단위 줄바꿈(CLAUDE.md '줄바꿈과 다국어' · 줄바꿈 정책).
 * 두 문장 이상이면 문장마다 <span class="snt">로 감싼다. 태블릿 이상에서 .snt는 한 덩어리(inline-block, base.css)라
 * 칸에 다 들어가면 한 줄, 모자라면 문장 사이에서 끊기고, 한 문장이 칸보다 길 때만 그 문장 안에서 어절 단위로 끊긴다.
 * 문장 끝: 마침표·물음표·느낌표 뒤 띄어쓰기(일본어는 。！？ 뒤). 문장 사이 띄어쓰기는 그대로 둔다(일본어는 없음).
 * 인라인 태그(b, a, span.nw …) 안에서는 나누지 않는다. 한 문장이면 그대로 돌려준다.
 */
const END = /([.!?](?=\s)|[。！？])(\s*)/g;
const VOID = /^<(br|wbr|img|input|source)\b/i;

export function sents(html: string): string {
  const out: { s: string; gap: string }[] = [];
  let cur = '';
  let depth = 0;
  for (const part of html.split(/(<[^>]+>)/)) {
    if (!part) continue;
    if (part.startsWith('<')) {
      if (part.startsWith('</')) depth = Math.max(0, depth - 1);
      else if (!part.endsWith('/>') && !VOID.test(part)) depth++;
      cur += part;
      continue;
    }
    if (depth > 0) { cur += part; continue; }
    let last = 0;
    END.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = END.exec(part))) {
      const end = m.index + m[1].length;
      if (end >= part.length && !m[2]) break; // 글 끝의 마침표: 다음 조각과 이어질 수 있다
      cur += part.slice(last, end);
      out.push({ s: cur, gap: m[2] });
      cur = '';
      last = end + m[2].length;
    }
    cur += part.slice(last);
  }
  if (cur.trim()) out.push({ s: cur, gap: '' });
  if (out.length < 2) return html;
  return out.map(({ s, gap }) => `<span class="snt">${s}</span>${gap}`).join('');
}
