#!/usr/bin/env node
/**
 * 콘텐츠 규칙 검사(CLAUDE.md '문구'·'색').
 *  1) 네 언어 콘텐츠 파일의 모양(키·배열 길이)이 국문과 같은지
 *  2) 보이는 문구에 긴 줄표(—)가 없는지
 *  3) '(개발 중)' 같은 표기, GROWA·LXP를 제품명처럼 쓴 곳이 없는지
 *  4) 청록(teal·cyan 계열) 색을 쓰지 않는지(스타일)
 *  5) 누적 사용자 240만 명은 레퍼런스(사업명과 함께)에서만, 히어로에는 쓰지 않는지
 * 대상: src/content 아래 JSON, src의 스타일·컴포넌트, dist의 HTML(최종 화면 글자)
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

const errors = [];
const files = (dir, ext) => {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (ext.some((x) => e.name.endsWith(x))) out.push(p);
    }
  })(dir);
  return out;
};

/* 1) 모양 */
const shape = (v) => (Array.isArray(v) ? v.map(shape) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])])) : typeof v);
// 번역은 마지막 단계에서 채운다. 그 전까지(--strict-i18n 없이) 모양 차이는 '번역 대기'로만 알린다
const STRICT_I18N = process.argv.includes('--strict-i18n');
const pending = [];
for (const section of readdirSync('src/content/home/ko')) {
  const ko = JSON.stringify(shape(JSON.parse(readFileSync(`src/content/home/ko/${section}`, 'utf8'))));
  for (const l of ['en', 'ja', 'vi']) {
    const f = `src/content/home/${l}/${section}`;
    let other = null;
    try { other = JSON.stringify(shape(JSON.parse(readFileSync(f, 'utf8')))); } catch { /* 파일 없음 */ }
    if (other !== ko) (STRICT_I18N ? errors : pending).push(`${other === null ? '파일 없음' : '모양 다름'}: ${f} (국문과 키·배열 길이가 다름)`);
  }
}
if (pending.length) console.log(`번역 대기 ${pending.length}건(국문 문구로 대신 보임):\n  ` + pending.join('\n  '));
{
  const ko = JSON.stringify(shape(JSON.parse(readFileSync('src/content/ui/ko.json', 'utf8'))));
  for (const l of ['en', 'ja', 'vi']) if (JSON.stringify(shape(JSON.parse(readFileSync(`src/content/ui/${l}.json`, 'utf8')))) !== ko) errors.push(`모양 다름: src/content/ui/${l}.json`);
}

/* 2)·3)·5) 최종 화면 글자(dist) */
const RULES = [
  [/—/, '긴 줄표(—)'],
  [/\(\s*개발\s*중\s*\)|開発中|in development|đang phát triển/i, "'개발 중' 표기"],
  [/\bGROWA\b/, 'GROWA 제품명'],
  [/\bLXP\b/, 'LXP 제품명'],
];
for (const f of files('dist', ['.html'])) {
  const doc = parse(readFileSync(f, 'utf8'));
  doc.querySelectorAll('script,style,noscript').forEach((n) => n.remove());
  const text = doc.querySelector('body')?.text ?? '';
  const attrs = doc.querySelectorAll('[alt],[aria-label],[title],[placeholder]').map((e) => ['alt', 'aria-label', 'title', 'placeholder'].map((a) => e.getAttribute(a) ?? '').join(' ')).join(' ');
  const head = ['title', 'meta[name=description]', 'meta[property="og:title"]', 'meta[property="og:description"]'].map((s) => doc.querySelector(s)).map((e) => e?.text || e?.getAttribute('content') || '').join(' ');
  for (const [re, what] of RULES) {
    for (const [where, t] of [['본문', text], ['속성', attrs], ['메타', head]]) {
      const m = re.exec(t);
      if (m) errors.push(`${what}: ${f} (${where}) …${t.slice(Math.max(0, m.index - 20), m.index + 20).replace(/\s+/g, ' ')}…`);
    }
  }
  const hero = doc.querySelector('#hero')?.text ?? '';
  if (/240\s*만|2\.4\s*million|240万|2,4 triệu/.test(hero)) errors.push(`히어로에 누적 사용자 수: ${f}`);
}

/* 4) 청록 */
const TEAL = /#(?:[0-3][0-9a-f][b-f][0-9a-f][b-f][0-9a-f])\b|\b(?:teal|cyan|aqua|turquoise)\b|#7ff0e8|#2dd4bf|#14b8a6|#06b6d4|#22d3ee/i;
for (const f of files('src', ['.css', '.astro', '.ts'])) {
  const s = readFileSync(f, 'utf8');
  const m = TEAL.exec(s);
  if (m) errors.push(`청록 색: ${f} (${m[0]})`);
}

import('node:fs').then(({ mkdirSync, writeFileSync }) => { mkdirSync('test-results', { recursive: true }); writeFileSync('test-results/content.json', JSON.stringify({ errors }, null, 1)); });
console.log(errors.length ? `콘텐츠 규칙 위반 ${errors.length}건` : '콘텐츠 규칙: 이상 없음');
for (const e of errors) console.log('  ✗ ' + e);
process.exitCode = errors.length ? 1 : 0;
