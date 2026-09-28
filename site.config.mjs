/**
 * 사이트 주소 설정: 한 곳에서만 바꾼다.
 *
 * 운영: https://wickedstorm.kr (AWS S3 + CloudFront, 도메인 루트). 기본값이 운영 주소다.
 * - GitHub Pages 미리보기: SITE_URL=https://wickedstormkr.github.io, BASE_PATH=/wickedstorm-homepage/ (.github/workflows/preview.yml)
 *
 * 빌드할 때 환경 변수로 덮어쓸 수 있다. 예: BASE_PATH=/wickedstorm-homepage/ npm run build
 */
export const SITE_URL = process.env.SITE_URL || 'https://wickedstorm.kr';
export const BASE_PATH = normalizeBase(process.env.BASE_PATH || '/');

/**
 * Google Analytics 4 측정 ID. 지금 사이트는 G-0Y5QD1HBGN.
 * 비워 두면 GA를 싣지 않는다(미리보기·CI 빌드가 운영 통계를 오염시키지 않게, 첫 로드 JS 예산 측정도 우리 코드 기준으로).
 * 운영 배포에서만 PUBLIC_GA_ID=G-0Y5QD1HBGN 으로 켠다.
 */
export const GA_ID = process.env.PUBLIC_GA_ID || '';

function normalizeBase(b) {
  let s = b.trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (!s.endsWith('/')) s += '/';
  return s;
}
