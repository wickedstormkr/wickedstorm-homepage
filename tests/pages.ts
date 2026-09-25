/** 점검 대상 페이지와 폭(CLAUDE.md '자동 점검') */
export const WIDTHS = [360, 390, 430, 768, 820, 1024, 1280, 1440, 1920] as const;
export const TOUCH_MAX = 1023; // 이 폭 이하는 터치 기준(누르는 곳 44px, 본문 15px)

export interface PageDef { id: string; path: string; lang: 'ko' | 'en' | 'ja' | 'vi' }

/** 홈 네 언어 */
export const HOMES: PageDef[] = [
  { id: 'home-ko', path: '', lang: 'ko' },
  { id: 'home-en', path: 'en/index.html', lang: 'en' },
  { id: 'home-ja', path: 'ja/index.html', lang: 'ja' },
  { id: 'home-vi', path: 'vi/index.html', lang: 'vi' },
];
/** 언어별 페이지(번역 단계 전까지 국문만) */
export const PAGES: PageDef[] = ['product', 'standards', 'cases', 'trust', 'company', 'contact'].map((p) => ({ id: p, path: `${p}.html`, lang: 'ko' as const }));
/** 그 밖의 페이지(국문) */
export const OTHERS: PageDef[] = [
  { id: 'news', path: 'news.html', lang: 'ko' },
  { id: 'article-fair', path: 'news/2026-09-edtech-korea-fair.html', lang: 'ko' },
  { id: 'article-patent', path: 'news/2025-11-patent-anomaly.html', lang: 'ko' },
  { id: 'article-insight', path: 'news/2026-07-note-aidt-standards.html', lang: 'ko' },
  { id: 'privacy', path: 'privacy.html', lang: 'ko' },
  { id: 'links', path: 'links.html', lang: 'ko' },
  { id: '404', path: '404.html', lang: 'ko' },
];
export const ALL = [...HOMES, ...PAGES, ...OTHERS];

export const LOCALE = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', vi: 'vi-VN' } as const;
export const viewportHeight = (w: number) => (w < 700 ? 844 : w < 1024 ? 1100 : 900);
