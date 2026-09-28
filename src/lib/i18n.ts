/** 네 언어의 기본 정보. 언어 이름은 원어로 쓴다(CLAUDE.md '언어 선택'). */
export const LANGS = ['ko', 'en', 'ja', 'vi'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'ko';

export const LANG_NAME: Record<Lang, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  vi: 'Tiếng Việt',
};
export const OG_LOCALE: Record<Lang, string> = { ko: 'ko_KR', en: 'en_US', ja: 'ja_JP', vi: 'vi_VN' };

/** 언어별 홈 주소(사이트 루트 기준, base 제외). 지금 사이트와 같은 주소. */
export const homePath = (lang: Lang) => (lang === 'ko' ? '/' : `/${lang}/index.html`);

export const isLang = (s: unknown): s is Lang => typeof s === 'string' && (LANGS as readonly string[]).includes(s);

/** 언어마다 따로 있는 페이지(제품·에듀테크·사례·신뢰·회사소개·문의). 국문은 루트, 다른 언어는 /<lang>/ 아래 */
export const PAGES = ['product', 'edutech', 'cases', 'trust', 'company', 'contact'] as const;
export type Page = (typeof PAGES)[number];
/** 페이지를 만든 언어(네 언어 모두). 개인정보처리방침 · 링크 모음은 국문만 있다 */
export const PAGE_LANGS: readonly Lang[] = LANGS;
/**
 * 메뉴 · 링크 · 사이트맵에서 뺀 페이지(숨김). 주소는 그대로 두고 검색에는 싣지 않는다(noindex).
 * 다시 보이려면 여기서 빼면 된다. 홈의 해당 섹션(제품 · 사례)은 그대로 둔다
 */
export const HIDDEN_PAGES: readonly Page[] = ['product', 'cases'];
export const isListed = (page: Page) => !HIDDEN_PAGES.includes(page);
export const pagePath = (lang: Lang, page: Page) =>
  lang === 'ko' || !PAGE_LANGS.includes(lang) ? `/${page}.html` : `/${lang}/${page}.html`;

/** 소식 목록·기사 주소. 국문은 /news.html, /news/<id>.html, 다른 언어는 /<lang>/ 아래 */
const langDir = (lang: Lang) => (lang === 'ko' ? '' : `/${lang}`);
export const newsPath = (lang: Lang) => `${langDir(lang)}/news.html`;
export const articlePath = (lang: Lang, id: string) => `${langDir(lang)}/news/${id}.html`;

/**
 * 콘텐츠 파일·소식 본문 안의 국문 주소(사이트 루트 기준)를 그 언어의 주소로: 홈('/', '/#contact'),
 * 언어별 페이지('/trust.html#gs'), 소식('/news.html', '/news/<id>.html'). 그 밖의 주소(개인정보처리방침 등)는 그대로
 */
export function localHref(lang: Lang, href: string): string {
  const m = /^\/(?:(index\.html)?|([a-z]+)\.html|news\/([a-z0-9-]+)\.html)(#.*)?$/.exec(href);
  if (!m) return href;
  const [, , page, id, hash = ''] = m;
  if (id) return articlePath(lang, id) + hash;
  if (page === 'news') return newsPath(lang) + hash;
  if (page) return (PAGES as readonly string[]).includes(page) ? pagePath(lang, page as Page) + hash : href;
  return lang === 'ko' ? href : homePath(lang) + hash;
}
