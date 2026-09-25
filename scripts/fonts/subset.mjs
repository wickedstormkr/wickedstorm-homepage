#!/usr/bin/env node
/**
 * 빌드 뒤 글꼴 서브셋(npm run build의 마지막 단계).
 *
 * 왜: 지금 사이트의 Pretendard 다이나믹 서브셋(92조각, unicode-range)은 한국어 홈에서 16~19조각 400KB 안팎을 받고,
 *     조각이 많아 글자마다 글꼴을 찾는 레이아웃 비용도 커서(폰 CPU 기준 2초 이상) 폰 LCP·TBT 예산을 넘었다.
 * 어떻게: dist/의 모든 HTML에 실제로 나온 글자만 담아 Pretendard Variable(원본 fonts-src/)을 두 파일로 자른다.
 *   - pretendard-latin: 라틴·베트남어·문장부호 등(모든 페이지)
 *   - pretendard-ko: 한글·한중일 기호(한글이 있는 페이지에서만 받는다, unicode-range)
 *   가변 글꼴 축(굵기)은 그대로 둔다. 파일 이름에 내용 해시를 붙이고, HTML의 fonts.css 주소도 해시 이름으로 바꾼다.
 *   소식이 새로 들어와 글자가 늘어도 빌드할 때마다 다시 자르므로 빠지는 글자가 없다.
 * 개발 서버는 public/fonts/fonts.css(다이나믹 서브셋)를 그대로 쓴다. 배포본(dist)에서는 다이나믹 서브셋을 지운다.
 */
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import subsetFont from 'subset-font';

const DIST = path.resolve('dist');
const SRC = path.resolve('fonts-src/PretendardVariable.woff2');

const htmlFiles = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(DIST);

// 글자 모으기: HTML 전체(글자·속성·템플릿·data-msg의 문의 폼 메시지 포함)를 그대로 훑는다. 넉넉하게 모아도 늘어나는 양은 작다
const chars = new Set();
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
for (const f of htmlFiles) {
  const s = decode(readFileSync(f, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => (/type="application\/ld\+json"/.test(m) ? '' : m)));
  for (const ch of s) chars.add(ch);
}
// 기본 라틴·숫자·문장부호는 늘 넣는다(스크립트가 만드는 글자 대비)
for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCharCode(c));
for (const ch of '·…‘’“”–→←↗↓※×°%€ ') chars.add(ch);

const isKo = (cp) =>
  (cp >= 0x1100 && cp <= 0x11ff) || (cp >= 0x3000 && cp <= 0x303f) || (cp >= 0x3130 && cp <= 0x318f) ||
  (cp >= 0x3200 && cp <= 0x32ff) || (cp >= 0xa960 && cp <= 0xa97f) || (cp >= 0xac00 && cp <= 0xd7af) ||
  (cp >= 0xd7b0 && cp <= 0xd7ff) || (cp >= 0xff00 && cp <= 0xffef);
const isJaOnly = (cp) => (cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0x3400 && cp <= 0x9fff); // Pretendard에 없음(시스템 글꼴)
const ko = [], latin = [];
for (const ch of chars) {
  const cp = ch.codePointAt(0);
  if (cp < 0x20 || isJaOnly(cp)) continue;
  (isKo(cp) ? ko : latin).push(ch);
}

const src = readFileSync(SRC);
const hash = (b) => createHash('sha256').update(b).digest('hex').slice(0, 10);
const out = {};
for (const [name, list] of [['latin', latin], ['ko', ko]]) {
  const buf = await subsetFont(src, list.join(''), { targetFormat: 'woff2' });
  const file = `pretendard-${name}.${hash(buf)}.woff2`;
  writeFileSync(path.join(DIST, 'fonts', file), buf);
  out[name] = { file, size: buf.length, count: list.length };
}

// unicode-range: 한글 파일은 한글·한중일 기호 범위만, 라틴 파일은 그 밖
const KO_RANGE = 'U+1100-11FF,U+3000-303F,U+3130-318F,U+3200-32FF,U+A960-A97F,U+AC00-D7FF,U+FF00-FFEF';
const face = (file, range) =>
  `@font-face{font-family:'Pretendard Variable';font-style:normal;font-display:swap;font-weight:45 920;src:url(${file}) format('woff2-variations'),url(${file}) format('woff2');unicode-range:${range}}`;
const sora = readFileSync(path.join(DIST, 'fonts/fonts.css'), 'utf8').match(/@font-face\{font-family:"Sora"[^}]*\}/)[0];
const css = [
  '/* 글꼴(빌드 때 사이트 글자만으로 자른 Pretendard Variable 1.3.9 + Sora). scripts/fonts/subset.mjs가 만든다. 라이선스: OFL */',
  face(out.latin.file, 'U+0000-0FFF,U+1E00-1FFF,U+2000-2FFF,U+A720-A7FF,U+FB00-FB4F,U+FE00-FE2F'),
  face(out.ko.file, KO_RANGE),
  sora,
  '',
].join('\n');
const cssName = `fonts.${hash(Buffer.from(css))}.css`;
writeFileSync(path.join(DIST, 'fonts', cssName), css);

// HTML이 해시 이름을 가리키게
for (const f of htmlFiles) {
  const s = readFileSync(f, 'utf8');
  const t = s.replace(/(href="[^"]*\/fonts\/)fonts\.css"/g, `$1${cssName}"`);
  if (t !== s) writeFileSync(f, t);
}
// 배포본에서 다이나믹 서브셋과 개발용 fonts.css는 뺀다
rmSync(path.join(DIST, 'fonts/pretendard/woff2-dynamic-subset'), { recursive: true, force: true });
rmSync(path.join(DIST, 'fonts/pretendard/PretendardVariable.vi.woff2'), { force: true });
rmSync(path.join(DIST, 'fonts/fonts.css'), { force: true });
if (!existsSync(path.join(DIST, 'fonts', out.ko.file))) throw new Error('글꼴 서브셋 실패');

const kb = (n) => (n / 1024).toFixed(1) + 'KB';
console.log(`[fonts] ${cssName}: latin ${out.latin.count}자 ${kb(out.latin.size)}, ko ${out.ko.count}자 ${kb(out.ko.size)}`);
