// @ts-check
import { defineConfig } from 'astro/config';
import { SITE_URL, BASE_PATH } from './site.config.mjs';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  // 지금 사이트의 주소를 그대로 지킨다: /news.html, /news/<id>.html, /privacy.html, /links.html, /en/index.html
  // (인쇄된 QR, 공유된 기사 주소, 검색 색인이 도메인 전환 뒤에도 이어지도록)
  build: { format: 'preserve' },
  trailingSlash: 'ignore',
  compressHTML: true,
  prefetch: false,
  image: {
    // 이미지 변환: sharp(AVIF·WebP, 폭별 srcset은 src/components/Img.astro)
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
