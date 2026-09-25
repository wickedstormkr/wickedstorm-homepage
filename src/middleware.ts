/**
 * 모든 HTML 응답에 조판(src/lib/typeset.ts)을 적용한다. 정적 빌드와 개발 서버 모두 같은 결과.
 */
import { defineMiddleware } from 'astro:middleware';
import { typeset } from './lib/typeset';

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const res = await next();
  if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res;
  const html = typeset(await res.text());
  return new Response(html, { status: res.status, headers: res.headers });
});
