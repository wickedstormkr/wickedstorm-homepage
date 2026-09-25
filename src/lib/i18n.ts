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
