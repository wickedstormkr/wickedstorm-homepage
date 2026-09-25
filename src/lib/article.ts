/**
 * 소식 본문 HTML 처리. 본문은 관리 화면에서 들어오므로 지금 사이트의 생성기
 * (homepage_renewal lambda/admin-api/news-artifacts.mjs sanitizeArticleBody)와 같은 허용 목록만 살린다.
 * - 태그: p strong em b i ul ol li h2 h3 blockquote figure figcaption br
 * - 링크: http(s)만. 지금 사이트 주소(https://wickedstorm.kr/...)는 사이트 안 주소로 바꿔 같은 창에서 연다
 * - 이미지: ./img/ 아래 파일만. Astro 자산 처리(AVIF·WebP, srcset)를 거치고 원본 링크로 감싼다
 */
import { getImage } from 'astro:assets';
import { hasImg, img } from './images';
import { url } from './url';

const SIMPLE = ['p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'figure', 'figcaption'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const isHttp = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};
const localImg = (v: string) =>
  v.startsWith('./img/') && !v.includes('\\') && !v.includes('//') && !v.split('/').includes('..') ? v.slice('./img/'.length) : null;

/** 이미지 하나를 <picture>로(원본 새 창 링크로 감쌈) */
export async function pictureHtml(name: string, alt: string, sizes: string, eager = false): Promise<string> {
  const src = img(name);
  const widths = [480, 800, 1200, 1600].filter((w) => w < src.width).concat(src.width);
  const [avif, webp] = await Promise.all([
    getImage({ src, widths, format: 'avif' }),
    getImage({ src, widths, format: 'webp' }),
  ]);
  const load = eager ? 'eager' : 'lazy';
  return (
    `<a class="img-orig" href="${esc(src.src)}" target="_blank" rel="noopener noreferrer" aria-label="원본 이미지 새 창에서 보기">` +
    `<picture><source type="image/avif" srcset="${esc(avif.srcSet.attribute)}" sizes="${sizes}">` +
    `<img src="${esc(webp.src)}" srcset="${esc(webp.srcSet.attribute)}" sizes="${sizes}" alt="${esc(alt)}" width="${src.width}" height="${src.height}" loading="${load}" decoding="async"></picture></a>`
  );
}

export async function renderBody(html: string): Promise<string> {
  let out = esc(html);
  out = out.replace(/&lt;br\s*\/?\s*&gt;/gi, '<br>');
  for (const t of SIMPLE) {
    out = out.replace(new RegExp(`&lt;${t}\\s*&gt;`, 'gi'), `<${t}>`).replace(new RegExp(`&lt;\\/${t}\\s*&gt;`, 'gi'), `</${t}>`);
  }
  out = out.replace(/&lt;a\s+((?:(?!&gt;)[\s\S])*?)&gt;([\s\S]*?)&lt;\/a\s*&gt;/gi, (full, attrs: string, inner: string) => {
    const m = /href\s*=\s*&quot;((?:(?!&quot;)[\s\S])*?)&quot;/i.exec(attrs);
    if (!m) return full;
    const href = unesc(m[1]).trim();
    if (!isHttp(href)) return full;
    const own = /^https:\/\/wickedstorm\.kr\//.exec(href);
    if (own) return `<a href="${esc(url('/' + href.slice(own[0].length)))}">${inner}</a>`;
    return `<a href="${esc(href)}" rel="noopener noreferrer" target="_blank">${inner}<span class="sr-only"> (새 창)</span></a>`;
  });
  // 이미지: 자리표시 후 비동기 처리
  const jobs: Promise<string>[] = [];
  out = out.replace(/&lt;img\s+((?:(?!&gt;)[\s\S])*?)\s*\/?&gt;/gi, (full, attrs: string) => {
    const s = /src\s*=\s*&quot;((?:(?!&quot;)[\s\S])*?)&quot;/i.exec(attrs);
    if (!s) return full;
    const name = localImg(unesc(s[1]).trim());
    if (!name || !hasImg(name)) return full;
    const a = /alt\s*=\s*&quot;((?:(?!&quot;)[\s\S])*?)&quot;/i.exec(attrs);
    jobs.push(pictureHtml(name, a ? unesc(a[1]) : '', '(min-width: 808px) 760px, calc(100vw - 48px)'));
    return `\u0000IMG${jobs.length - 1}\u0000`;
  });
  const done = await Promise.all(jobs);
  out = out.replace(/\u0000IMG(\d+)\u0000/g, (_m, i: string) => done[Number(i)]);
  // 제목 단계: 페이지 제목이 h1이므로 본문 소제목은 h2부터(h3만 있으면 h2로 올린다)
  if (!/<h2>/.test(out) && /<h3>/.test(out)) out = out.replace(/<(\/?)h3>/g, '<$1h2>');
  return out;
}

/** 요약(메타 설명): 태그를 걷어 내고 160자 */
export function describe(summary: string, body: string): string {
  const text = (summary.trim() ? summary : body).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? text.slice(0, 159) + '…' : text;
}
