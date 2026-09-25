/**
 * 경로 도우미. 사이트 안 주소는 모두 이 함수를 거쳐 base 경로(site.config.mjs BASE_PATH)를 붙인다.
 * 콘텐츠 파일 안 주소는 사이트 루트 기준('/privacy.html')으로 적고, 화면에 낼 때 withBase로 바꾼다.
 */
const BASE = import.meta.env.BASE_URL; // 항상 '/'로 끝난다
const SITE = (import.meta.env.SITE ?? 'https://wickedstorm.kr').replace(/\/$/, '');

/** '/news.html' → '<base>news.html'. 외부 주소·mailto·tel·해시는 그대로. */
export function url(path: string): string {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(path)) return path;
  return BASE + path.replace(/^\/+/, '');
}

/** 완전한 주소(canonical, hreflang, OG). */
export function absUrl(path: string): string {
  return SITE + url(path);
}

/** HTML 문자열 안 href="/..."·src="/..."에 base를 붙인다. 지금 사이트 주소(https://wickedstorm.kr/)도 사이트 안 주소로 바꾼다. */
export function withBase(html: string): string {
  return html
    .replace(/(href|src)="https:\/\/wickedstorm\.kr\/(?!\/)/g, '$1="/')
    .replace(/(href|src)="\/(?!\/)([^"]*)"/g, (_m, attr: string, p: string) => `${attr}="${url('/' + p)}"`);
}
