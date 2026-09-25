/**
 * 조판: 마지막 줄에 한 단어만 남지 않게(CLAUDE.md '줄바꿈과 다국어').
 * 모든 페이지 HTML이 나가기 전에 한 번 거친다(src/middleware.ts). 콘텐츠 파일은 그대로 두고, 화면에 낼 때만 적용한다.
 *
 * - 한국어·영어·베트남어: 글 칸의 마지막 두 단어 사이 띄어쓰기를 줄바꿈 없는 공백(U+00A0)으로 바꾼다.
 *   두 단어가 너무 길면(합쳐 LIMIT자 초과) 좁은 칸에서 넘칠 수 있어 묶지 않는다.
 * - 일본어: 띄어쓰기가 없으므로 BudouX로 구를 나눠, 마지막 구가 짧으면 앞 구와 한 덩어리(.jt, keep-all)로 묶는다.
 * - 숫자-숫자(특허·전화번호)는 하이픈에서 끊기지 않게 묶는다(.nb).
 * 글 칸 = 블록 태그(p, li, h1…) 또는 클래스가 있는 요소(대부분 블록·플렉스 항목). 글자 모양용 인라인 클래스는 제외.
 */
import { parse, HTMLElement, TextNode, type Node } from 'node-html-parser';
import { Parser, jaModel } from 'budoux';

const ja = new Parser(jaModel);
const LIMIT = 28;
const SKIP = new Set(['script', 'style', 'textarea', 'pre', 'code', 'title', 'option', 'select', 'svg', 'noscript', 'template', 'head']);
const INLINE = new Set(['a', 'b', 'strong', 'em', 'i', 'span', 'small', 'sup', 'sub', 'time', 'abbr', 'br', 'wbr', 'img', 'picture', 'source', 'mark', 'u', 's', 'q', 'cite']);
/** 글자 모양만 바꾸는 인라인 클래스(글 칸이 아님) */
const INLINE_CLASS = new Set(['g', 'gc', 'nw', 'bx', 'unit', 'arw', 'en', 'tnum', 'sr-only', 'yr']);

function isContainer(el: HTMLElement): boolean {
  const tag = el.rawTagName?.toLowerCase();
  if (!tag) return false;
  if (!INLINE.has(tag)) return true;
  const cls = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
  return cls.length > 0 && !cls.every((c) => INLINE_CLASS.has(c));
}

/** 글 칸 안의 글자 조각(안쪽 글 칸은 제외) */
function textNodes(el: HTMLElement, out: TextNode[] = []): TextNode[] {
  for (const c of el.childNodes as Node[]) {
    if (c instanceof TextNode) out.push(c);
    else if (c instanceof HTMLElement) {
      const tag = c.rawTagName?.toLowerCase();
      if (!tag || SKIP.has(tag) || isContainer(c) || c.classList.contains('sr-only')) continue;
      out.push(...textNodes(c));
    }
  }
  return out;
}

const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const units = (raw: string) => raw.match(/&[a-zA-Z#0-9]+;|[\s\S]/gu) ?? [];
const isSp = (u: string) => u === ' ' || u === '\n' || u === '\t' || u === '\r';
const isNb = (u: string) => u === '&nbsp;' || u === '&#160;' || u === '\u00a0';

function bindSpaces(nodes: TextNode[]) {
  const full = nodes.map((n) => decode(n.rawText)).join('');
  const words = full.trim().split(/[ \t\n\r\u00a0]+/).filter(Boolean);
  if (words.length < 3) return;
  if ([...words[words.length - 1]].length + [...words[words.length - 2]].length > LIMIT) return;
  // 뒤에서부터 마지막 단어를 지나 처음 만나는 띄어쓰기를 &nbsp;로 바꾼다
  let inWord = false;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const u = units(nodes[i].rawText);
    for (let j = u.length - 1; j >= 0; j--) {
      if (isNb(u[j])) { if (inWord) return; continue; } // 이미 묶여 있음
      if (!isSp(u[j])) { inWord = true; continue; }
      if (!inWord) continue; // 끝의 공백
      let k = j;
      while (k > 0 && isSp(u[k - 1])) k--;
      u.splice(k, j - k + 1, '&nbsp;');
      nodes[i].rawText = u.join('');
      return;
    }
  }
}

const hasJa = (s: string) => /[\u3040-\u30ff\u3400-\u9fff]/.test(s);

const letters = (x: string) => (x.match(/[\p{L}\p{N}]/gu) ?? []).length;

function bindJa(nodes: TextNode[]) {
  // 화살표 같은 기호만 있는 조각은 건너뛰고, 글자가 있는 마지막 조각을 고른다
  const last = [...nodes].reverse().find((n) => /[\p{L}\p{N}]/u.test(n.rawText));
  if (!last) return;
  const raw = last.rawText;
  // 일본어 페이지 안의 영문(표준 이름 등)은 띄어쓰기 규칙으로
  if (!hasJa(raw)) return bindSpaces(nodes);
  if (raw.includes('<') || /&[a-z#0-9]+;/i.test(raw)) return;
  // 제목(.bx)처럼 이미 구 사이에 <wbr>이 있으면: 마지막 구가 세 글자 이하일 때 그 앞 <wbr>을 지워 앞 구와 붙인다
  const parent = last.parentNode as HTMLElement | null;
  if (parent) {
    const i = parent.childNodes.indexOf(last);
    const prev = parent.childNodes[i - 1];
    if (prev instanceof HTMLElement && prev.rawTagName?.toLowerCase() === 'wbr') {
      if (letters(raw) <= 3) parent.removeChild(prev);
      return;
    }
  }
  const total = letters(nodes.map((n) => n.rawText).join(''));
  if (total < 8) return;
  // 묶을 끝부분: 마지막 구(여덟 글자 이하일 때)와 '끝에서 다섯 글자' 중 긴 쪽.
  // 묶음(.jt)은 keep-all이라 그 안에서는 줄을 바꾸지 않고, 칸보다 길면 overflow-wrap:anywhere로 비상 줄바꿈된다
  const chars = [...raw];
  let start = chars.length;
  let n = 0;
  while (start > 0 && n < 5) { start--; if (/[\p{L}\p{N}]/u.test(chars[start])) n++; }
  const phrases = ja.parse(raw);
  const lp = phrases[phrases.length - 1] ?? '';
  if (letters(lp) <= 8) start = Math.min(start, chars.length - [...lp].length);
  if (start <= 0) return;
  last.rawText = chars.slice(0, start).join('') + `<span class="jt">${chars.slice(start).join('')}</span>`;
}

/** 특허·전화번호처럼 숫자-숫자는 하이픈에서 끊기지 않게. 바로 앞에 붙은 괄호와 한글·영문 낱말까지 한 덩어리로 */
function keepNumbers(n: TextNode) {
  if (!/\d-\d/.test(n.rawText)) return;
  n.rawText = n.rawText.replace(/(?:[\p{Script=Hangul}\p{Script=Latin}]{1,12}\(|\()?\d+(?:-\d+)+\)?/gu, '<span class="nb">$&</span>');
}

export function typeset(html: string): string {
  const root = parse(html, { comment: true, blockTextElements: { script: true, style: true, noscript: true, pre: true, textarea: true } });
  const htmlEl = root.querySelector('html');
  const pageLang = (htmlEl?.getAttribute('lang') ?? 'ko').slice(0, 2);
  const walk = (el: HTMLElement, lang: string) => {
    for (const c of el.childNodes as Node[]) {
      if (!(c instanceof HTMLElement)) continue;
      const tag = c.rawTagName?.toLowerCase();
      if (!tag || SKIP.has(tag)) continue;
      const l = (c.getAttribute('lang') ?? lang).slice(0, 2);
      if (isContainer(c) && !c.classList.contains('nw')) {
        const nodes = textNodes(c);
        if (nodes.some((n) => n.rawText.trim())) {
          if (l === 'ja') bindJa(nodes);
          else bindSpaces(nodes);
          for (const t of nodes) keepNumbers(t);
        }
      }
      walk(c, l);
    }
  };
  const body = root.querySelector('body');
  if (body) walk(body, pageLang);
  return root.toString();
}
