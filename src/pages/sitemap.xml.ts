/**
 * sitemap.xml: canonical과 같은 주소(/news.html, /en/index.html …)로 쓴다. 홈과 언어별 페이지는 네 언어 hreflang을 함께 싣는다.
 * 지금 사이트와 같은 위치(/sitemap.xml)라 도메인 전환 뒤에도 검색 콘솔 설정을 그대로 쓴다.
 */
import type { APIRoute } from 'astro';
import { allPosts } from '../lib/posts';
import { LANGS, PAGES, PAGE_LANGS, homePath, pagePath, type Lang } from '../lib/i18n';
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
    `<url><loc>${absUrl('/news.html')}</loc></url>`,
    `<url><loc>${absUrl('/privacy.html')}</loc></url>`,
    ...posts.map((p) => `<url><loc>${absUrl(`/news/${p.id}.html`)}</loc><lastmod>${p.date.replace(/\./g, '-')}</lastmod></url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
