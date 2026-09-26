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

/** 언어마다 따로 있는 페이지(제품·표준·사례·신뢰·회사·문의). 국문은 루트, 다른 언어는 /<lang>/ 아래 */
export const PAGES = ['product', 'standards', 'cases', 'trust', 'company', 'contact'] as const;
export type Page = (typeof PAGES)[number];
/** 페이지를 만든 언어(네 언어 모두). 소식 · 개인정보처리방침 · 링크 모음은 국문만 있다 */
export const PAGE_LANGS: readonly Lang[] = LANGS;
export const pagePath = (lang: Lang, page: Page) =>
  lang === 'ko' || !PAGE_LANGS.includes(lang) ? `/${page}.html` : `/${lang}/${page}.html`;
