/**
 * 일본어 제목의 구(句) 단위 줄바꿈. 빌드할 때 BudouX로 구 사이에 <wbr>을 넣고,
 * .bx(word-break:keep-all; overflow-wrap:anywhere)로 감싸 Safari까지 같은 줄바꿈을 보장한다.
 * 다른 언어는 그대로 돌려준다. 인라인 태그(span.g 등)는 건드리지 않고 글자 조각에만 적용한다.
 */
import { Parser, jaModel } from 'budoux';
import type { Lang } from './i18n';

const ja = new Parser(jaModel);

export function phrase(html: string, lang: Lang): string {
  if (lang !== 'ja') return html;
  const out = html
    .split(/(<[^>]+>|&[a-z#0-9]+;)/i)
    .map((part) => (part.startsWith('<') || part.startsWith('&') || !part ? part : ja.parse(part).join('<wbr>')))
    .join('');
  return `<span class="bx">${out}</span>`;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
/** 태그가 없는 글(콘텐츠의 일반 문자열)을 안전하게 옮긴 뒤 phrase()를 적용한다 */
export function phraseText(text: string, lang: Lang): string {
  return phrase(text.replace(/[&<>"]/g, (c) => ESC[c]), lang);
}
