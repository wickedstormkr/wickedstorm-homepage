/**
 * Lighthouse CI: 폰 기준(Lighthouse 기본 모바일 에뮬레이션: 느린 4G, CPU 4배 느림) 성능 예산.
 * CLAUDE.md 성능 예산: 폰 LCP 2.5초 이하, CLS 0.1 이하, INP 200ms 이하, 첫 로드 JS 90KB(gzip) 이하.
 * INP는 실험실에서 잴 수 없어, 같은 원인(긴 메인 스레드 작업)을 보는 TBT 200ms 이하로 대신한다.
 * `npm run build` 뒤 `npm run test:lh` 로 실행한다.
 */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['/index.html', '/en/index.html', '/vi/index.html', '/news.html', '/news/2026-09-edtech-korea-fair.html'],
      numberOfRuns: 5,
      settings: {
        chromeFlags: '--no-sandbox --headless=new',
        // 첫 로드 기준: 캐시 없이, 한국어 브라우저로
        extraHeaders: JSON.stringify({ 'Accept-Language': 'ko-KR,ko;q=0.9' }),
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median' }],
        // 첫 로드 JS(전송 크기 = gzip) 90KB
        'resource-summary:script:size': ['error', { maxNumericValue: 92160, aggregationMethod: 'median' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median' }],
        'categories:best-practices': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:seo': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
