#!/usr/bin/env node
/**
 * 깨진 링크 검사(dist/ 기준).
 *   node scripts/checks/links.mjs              사이트 안 링크·자산·#앵커만(빠름, CI에서 실패 처리)
 *   node scripts/checks/links.mjs --external   바깥 링크도 확인(경고만, 봇을 막는 사이트가 있어 실패로 치지 않음)
 * 보는 것: a[href], link[href], img[src|srcset], source[srcset], video[poster], source[src], script[src]
 * 결과는 test-results/links.json 에도 남긴다.
 */
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

const DIST = path.resolve('dist');
const BASE = (process.env.BASE_PATH || '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
const EXTERNAL = process.argv.includes('--external');

const htmlFiles = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(DIST);

const docs = new Map(); // 파일 → 문서(앵커 확인용)
const load = (f) => {
  if (!docs.has(f)) docs.set(f, parse(readFileSync(f, 'utf8')));
  return docs.get(f);
};

/** 사이트 주소 → dist 파일 */
function resolveFile(pathname) {
  let p = decodeURIComponent(pathname);
  if (!p.startsWith(BASE)) return null;
  p = '/' + p.slice(BASE.length);
  const cands = p.endsWith('/') ? [p + 'index.html'] : [p, p + '.html', p + '/index.html'];
  for (const c of cands) {
    const f = path.join(DIST, c);
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

const broken = [];
const external = new Map(); // url → [출처]
for (const file of htmlFiles) {
  const rel = '/' + path.relative(DIST, file).split(path.sep).join('/');
  const pageUrl = new URL(BASE.replace(/\/$/, '') + rel, 'http://site.local');
  const doc = load(file);
  const refs = [];
  for (const el of doc.querySelectorAll('a[href], link[href]')) refs.push(el.getAttribute('href'));
  for (const el of doc.querySelectorAll('img[src], script[src], source[src]')) refs.push(el.getAttribute('src'));
  for (const el of doc.querySelectorAll('video[poster]')) refs.push(el.getAttribute('poster'));
  for (const el of doc.querySelectorAll('img[srcset], source[srcset]')) {
    for (const part of el.getAttribute('srcset').split(',')) refs.push(part.trim().split(/\s+/)[0]);
  }
  for (const ref of refs) {
    if (!ref || /^(mailto:|tel:|javascript:|data:)/.test(ref)) continue;
    if (ref === '#') { if (!doc.querySelector(`a[href="#"][data-social]`)) broken.push({ page: rel, ref, why: '빈 링크(#)' }); continue; }
    const u = new URL(ref, pageUrl);
    if (u.origin !== 'http://site.local') {
      // 이 사이트의 운영 주소(canonical·OG)는 바깥 링크로 보지 않는다
      if (!/^https:\/\/wickedstorm\.kr\//.test(u.href)) external.set(u.href.split('#')[0], [...(external.get(u.href.split('#')[0]) ?? []), rel]);
      continue;
    }
    const target = u.pathname === pageUrl.pathname ? file : resolveFile(u.pathname);
    if (!target) { broken.push({ page: rel, ref, why: '파일 없음' }); continue; }
    if (u.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(u.hash.slice(1));
      if (!/^p=/.test(id) && !['news', 'story', 'insight', 'all'].includes(id) && !load(target).getElementById(id)) broken.push({ page: rel, ref, why: `앵커 #${id} 없음` });
    }
  }
}

const extResults = [];
if (EXTERNAL) {
  const list = [...external.keys()];
  await Promise.all(list.map(async (href) => {
    let status = 0;
    try {
      let r = await fetch(href, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (r.status >= 400) r = await fetch(href, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      status = r.status;
    } catch (e) { status = -1; }
    extResults.push({ href, status, pages: [...new Set(external.get(href))] });
  }));
}

mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/links.json', JSON.stringify({ pages: htmlFiles.length, broken, external: EXTERNAL ? extResults : [...external.keys()] }, null, 1));
console.log(`페이지 ${htmlFiles.length}개, 사이트 안 깨진 링크 ${broken.length}개, 바깥 링크 ${external.size}개`);
for (const b of broken) console.log(`  ✗ ${b.page} → ${b.ref} (${b.why})`);
if (EXTERNAL) {
  const bad = extResults.filter((r) => r.status < 200 || r.status >= 400);
  console.log(`바깥 링크 확인: 문제 ${bad.length}개(경고)`);
  for (const b of bad) console.log(`  ! ${b.status} ${b.href}  (${b.pages.join(', ')})`);
}
process.exitCode = broken.length ? 1 : 0;
