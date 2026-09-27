/**
 * sitemap.xml: canonical과 같은 주소(/news.html, /en/index.html …)로 쓴다. 홈·언어별 페이지·소식은 언어판 hreflang을 함께 싣는다.
 * 번역이 없는 기사의 다른 언어판(국문 본문, noindex)은 싣지 않는다.
 * 지금 사이트와 같은 위치(/sitemap.xml)라 도메인 전환 뒤에도 검색 콘솔 설정을 그대로 쓴다.
 */
import type { APIRoute } from 'astro';
import { allPosts, localPost } from '../lib/posts';
import { LANGS, PAGES, PAGE_LANGS, articlePath, homePath, newsPath, pagePath, type Lang } from '../lib/i18n';
import { absUrl } from '../lib/url';

export const GET: APIRoute = async () => {
  const posts = (await allPosts()).filter((p) => !p.externalUrl);
  const alts = (langs: readonly Lang[], path: (l: Lang) => string) =>
    langs.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${absUrl(path(l))}"/>`).join('')
    + `<xhtml:link rel="alternate" hreflang="x-default" href="${absUrl(path('ko'))}"/>`;
  const homeAlt = alts(LANGS, homePath);
  const urls = [
    ...LANGS.map((l) => `<url><loc>${absUrl(homePath(l))}</loc>${homeAlt}</url>`),
    ...PAGES.flatMap((pg) => {
      const alt = PAGE_LANGS.length > 1 ? alts(PAGE_LANGS, (l) => pagePath(l, pg)) : '';
      return PAGE_LANGS.map((l) => `<url><loc>${absUrl(pagePath(l, pg))}</loc>${alt}</url>`);
    }),
    ...LANGS.map((l) => `<url><loc>${absUrl(newsPath(l))}</loc>${alts(LANGS, newsPath)}</url>`),
    `<url><loc>${absUrl('/privacy.html')}</loc></url>`,
    ...posts.flatMap((p) => {
      const langs = LANGS.filter((l) => localPost(p, l).contentLang === l);
      const alt = langs.length > 1 ? alts(langs, (l) => articlePath(l, p.id)) : '';
      const mod = `<lastmod>${p.date.replace(/\./g, '-')}</lastmod>`;
      return langs.map((l) => `<url><loc>${absUrl(articlePath(l, p.id))}</loc>${mod}${alt}</url>`);
    }),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
