#!/usr/bin/env node
/**
 * 빌드 뒤 글꼴 서브셋(npm run build의 마지막 단계).
 *
 * 왜: 지금 사이트의 Pretendard 다이나믹 서브셋(92조각, unicode-range)은 한국어 홈에서 16~19조각 400KB 안팎을 받고,
 *     조각이 많아 글자마다 글꼴을 찾는 레이아웃 비용도 커서(폰 CPU 기준 2초 이상) 폰 LCP·TBT 예산을 넘었다.
 *     또 모든 글자를 사이트가 싣는 글꼴로 그려야 기기마다 줄바꿈이 같다. 일본어 한자가 시스템 글꼴(맥 Hiragino, 리눅스 Noto)로
 *     떨어지면 맥과 CI의 줄바꿈이 달라진다(tests/glyphs.spec.ts가 지킨다).
 * 어떻게: dist/의 HTML에 실제로 나온 글자만 담아 자른다. 가변 글꼴 축(굵기)은 그대로 둔다.
 *   - Pretendard Variable 라틴: 라틴·베트남어·문장부호 등(모든 페이지가 같은 파일)
 *   - Pretendard Variable 한글: 한글·한중일 기호(fonts-src/PretendardVariable.woff2)
 *   - Pretendard JP Variable: 가나·한자·일본어 문장부호(npm pretendard-jp). 일본어 페이지는 글꼴 목록에서 이것이 먼저다(tokens.css)
 *   - JetBrains Mono Variable: 코드·시각(--mono, npm @fontsource-variable/jetbrains-mono)
 *   한글·일본어 파일은 언어마다 그 언어 페이지의 글자만 담는다. 한국어 페이지는 언어 선택의 '日本語' 세 글자만 받는다.
 *   언어마다 fonts.<언어>.<해시>.css를 만들고, 페이지(경로로 언어를 가림)가 자기 언어의 CSS를 가리키게 한다.
 *   글꼴에 없는 글자가 페이지에 나오면 빌드를 멈춘다(시스템 글꼴로 떨어지지 않게).
 * 개발 서버는 public/fonts/fonts.css(다이나믹 서브셋)를 그대로 쓴다. 배포본(dist)에서는 다이나믹 서브셋을 지운다.
 */
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import subsetFont from 'subset-font';
import { create as openFont } from 'fontkitten';

const require = createRequire(import.meta.url);
const DIST = path.resolve('dist');
const SRC = {
  pretendard: path.resolve('fonts-src/PretendardVariable.woff2'),
  jp: require.resolve('pretendard-jp/dist/web/variable/woff2/PretendardJPVariable.woff2'),
  mono: path.dirname(require.resolve('@fontsource-variable/jetbrains-mono/package.json')),
};
const LANGS = ['ko', 'en', 'ja', 'vi'];

const htmlFiles = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(DIST);
const langOf = (f) => {
  const top = path.relative(DIST, f).split(path.sep)[0];
  return LANGS.includes(top) ? top : 'ko';
};

// 글자 모으기: HTML 전체(글자·속성·템플릿·data-msg의 문의 폼 메시지 포함)를 그대로 훑는다. 넉넉하게 모아도 늘어나는 양은 작다
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
const chars = Object.fromEntries(LANGS.map((l) => [l, new Set()]));
// 화면에 보이는 글(태그 사이의 글자)만 따로: 다른 언어 글꼴을 이 글자와 나머지(안내 띠 문구 등 스크립트가 쓰는 글) 두 파일로 나눈다
const visible = Object.fromEntries(LANGS.map((l) => [l, new Set()]));
for (const f of htmlFiles) {
  const raw = readFileSync(f, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => (/type="application\/ld\+json"/.test(m) ? '' : m));
  for (const ch of decode(raw)) chars[langOf(f)].add(ch);
  const text = raw.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, '');
  // 404는 네 언어를 한 페이지에 싣는다. 그 글자는 나머지 파일로(다른 페이지가 404 때문에 더 받지 않게)
  if (path.basename(f) !== '404.html') for (const ch of decode(text)) visible[langOf(f)].add(ch);
}
// CSS content로 그리는 글자(✓ · → 등)는 모든 언어에
const cssFiles = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.css') && !p.includes(`${path.sep}fonts${path.sep}`)) cssFiles.push(p);
  }
})(DIST);
const base = [];
for (const f of cssFiles) for (const [, a, b] of readFileSync(f, 'utf8').matchAll(/content:\s*(?:"([^"]*)"|'([^']*)')/g)) base.push(...(a ?? b).replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))));
// 대문자로 바꿔 보이는 글자(text-transform: uppercase · 베트남어 Ộ 등)도 넣는다
for (const set of [...Object.values(chars), ...Object.values(visible)]) for (const ch of [...set]) for (const c of [ch.toUpperCase(), ch.toLowerCase()]) if ([...c].length === 1) set.add(c);
// 기본 라틴·숫자·문장부호는 늘 넣는다(스크립트가 만드는 글자 대비)
for (let c = 0x20; c <= 0x7e; c++) base.push(String.fromCharCode(c));
for (const ch of '·…‘’“”–→←↗↓※×°%€ ') base.push(ch);
const all = new Set(base);
for (const l of LANGS) for (const ch of chars[l]) all.add(ch);

// unicode-range 문자열 ⇄ 판정
const inRange = (range) => {
  const parts = range.split(',').map((r) => r.trim().replace(/^U\+/i, '').split('-').map((h) => parseInt(h, 16)));
  return (cp) => parts.some(([a, b = a]) => cp >= a && cp <= b);
};
const KO_RANGE = 'U+1100-11FF,U+3000-303F,U+3130-318F,U+3200-32FF,U+A960-A97F,U+AC00-D7FF,U+FF00-FFEF';
const JP_RANGE = 'U+3000-303F,U+3040-30FF,U+31F0-31FF,U+3400-4DBF,U+4E00-9FFF,U+F900-FAFF,U+FF00-FFEF';
const LATIN_RANGE = 'U+0000-0FFF,U+1E00-1FFF,U+2000-2FFF,U+A720-A7FF,U+FB00-FB4F,U+FE00-FE2F';
const isKo = inRange('U+1100-11FF,U+3130-318F,U+3200-32FF,U+A960-A97F,U+AC00-D7FF');
const isCjkPunct = inRange('U+3000-303F,U+FF00-FFEF');
const isJp = inRange(JP_RANGE);
const isLatin = inRange(LATIN_RANGE);
// 글자 목록 → 그 글자만 가리키는 unicode-range
const rangeOf = (list) => list.map((ch) => ch.codePointAt(0)).sort((a, b) => a - b).map((cp) => `U+${cp.toString(16).toUpperCase()}`).join(',');

const hash = (b) => createHash('sha256').update(b).digest('hex').slice(0, 10);
const kb = (n) => (n / 1024).toFixed(1) + 'KB';
const fontBuf = { pretendard: readFileSync(SRC.pretendard), jp: readFileSync(SRC.jp) };
const cover = { pretendard: openFont(fontBuf.pretendard), jp: openFont(fontBuf.jp) };
const missing = [];
const written = new Map(); // 같은 내용은 한 파일로
const log = [];
async function cut(name, buf, list, opts = {}) {
  const out = await subsetFont(buf, list.join(''), { targetFormat: 'woff2', ...opts });
  const file = `${name}.${hash(out)}.woff2`;
  if (!written.has(file)) writeFileSync(path.join(DIST, 'fonts', file), out);
  written.set(file, out.length);
  log.push(`${name} ${list.length}자 ${kb(out.length)}`);
  return file;
}
const face = (family, file, range, weight = '45 920') =>
  `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${weight};src:url(${file}) format('woff2-variations'),url(${file}) format('woff2');unicode-range:${range}}`;

// 공통: 라틴(모든 언어가 같은 파일)
const latin = [...all].filter((ch) => {
  const cp = ch.codePointAt(0);
  return cp >= 0x20 && isLatin(cp);
});
for (const ch of latin) if (!cover.pretendard.hasGlyphForCodePoint(ch.codePointAt(0)) && ch.codePointAt(0) > 0x20) missing.push(`Pretendard: ${ch} U+${ch.codePointAt(0).toString(16)}`);
const latinFile = await cut('pretendard-latin', fontBuf.pretendard, latin);

// 공통: 고정폭(라틴 · 라틴 확장 · 베트남어 조각). 없는 글자는 목록의 다음 글꼴(Pretendard)로 간다.
// 쓰는 굵기(400 · 600)만 남겨 크기를 줄인다(홈 첫 화면에서도 받는다)
const monoRanges = JSON.parse(readFileSync(path.join(SRC.mono, 'unicode.json'), 'utf8'));
const monoFaces = [];
for (const piece of ['vietnamese', 'latin-ext', 'latin']) {
  const has = inRange(monoRanges[piece]);
  const list = [...all].filter((ch) => ch.codePointAt(0) >= 0x20 && has(ch.codePointAt(0)));
  if (!list.length) continue;
  const file = await cut(`mono-${piece}`, readFileSync(path.join(SRC.mono, `files/jetbrains-mono-${piece}-wght-normal.woff2`)), list, { variationAxes: { wght: { min: 400, max: 600 } } });
  monoFaces.push(face('JetBrains Mono Variable', file, monoRanges[piece], '400 600'));
}

const sora = readFileSync(path.join(DIST, 'fonts/fonts.css'), 'utf8').match(/@font-face\{font-family:"Sora"[^}]*\}/)[0];
const cssFor = {};
for (const l of LANGS) {
  const own = [...chars[l]];
  // 일본어 페이지의 한중일 문장부호는 Pretendard JP가 그린다(글꼴 목록에서 먼저)
  const ko = own.filter((ch) => isKo(ch.codePointAt(0)) || (l !== 'ja' && isCjkPunct(ch.codePointAt(0))));
  const jp = own.filter((ch) => isJp(ch.codePointAt(0)) && (l === 'ja' || !isCjkPunct(ch.codePointAt(0))));
  for (const ch of ko) if (!cover.pretendard.hasGlyphForCodePoint(ch.codePointAt(0))) missing.push(`Pretendard(${l}): ${ch}`);
  for (const ch of jp) if (!cover.jp.hasGlyphForCodePoint(ch.codePointAt(0))) missing.push(`Pretendard JP(${l}): ${ch}`);
  const faces = [face('Pretendard Variable', latinFile, LATIN_RANGE)];
  if (ko.length) faces.push(face('Pretendard Variable', await cut(`pretendard-ko-${l}`, fontBuf.pretendard, ko), KO_RANGE));
  if (l === 'ja') faces.push(face('Pretendard JP Variable', await cut('pretendard-jp-ja', fontBuf.jp, jp), JP_RANGE));
  else {
    // 다른 언어 페이지: 언어 선택의 '日本語' 같은 보이는 글자만 먼저 받고, 나머지는 쓰일 때만 받는다
    const seen = jp.filter((ch) => visible[l].has(ch));
    const rest = jp.filter((ch) => !visible[l].has(ch));
    if (seen.length) faces.push(face('Pretendard JP Variable', await cut(`pretendard-jp-${l}`, fontBuf.jp, seen), rangeOf(seen)));
    if (rest.length) faces.push(face('Pretendard JP Variable', await cut(`pretendard-jp-${l}-more`, fontBuf.jp, rest), rangeOf(rest)));
  }
  const css = [
    `/* 글꼴(${l}): 빌드 때 사이트 글자만으로 자른 Pretendard Variable · Pretendard JP Variable 1.3.9 + JetBrains Mono + Sora. scripts/fonts/subset.mjs가 만든다. 라이선스: OFL */`,
    ...faces,
    ...monoFaces,
    sora,
    '',
  ].join('\n');
  cssFor[l] = `fonts.${l}.${hash(Buffer.from(css))}.css`;
  writeFileSync(path.join(DIST, 'fonts', cssFor[l]), css);
}
if (missing.length) throw new Error(`글꼴에 없는 글자(시스템 글꼴로 떨어짐):\n${[...new Set(missing)].join('\n')}`);

// HTML이 자기 언어의 해시 이름을 가리키게
for (const f of htmlFiles) {
  const s = readFileSync(f, 'utf8');
  const t = s.replace(/(href="[^"]*\/fonts\/)fonts\.css"/g, `$1${cssFor[langOf(f)]}"`);
  if (t !== s) writeFileSync(f, t);
}
// 배포본에서 다이나믹 서브셋과 개발용 fonts.css는 뺀다
rmSync(path.join(DIST, 'fonts/pretendard/woff2-dynamic-subset'), { recursive: true, force: true });
rmSync(path.join(DIST, 'fonts/pretendard/PretendardVariable.vi.woff2'), { force: true });
rmSync(path.join(DIST, 'fonts/fonts.css'), { force: true });
for (const f of written.keys()) if (!existsSync(path.join(DIST, 'fonts', f))) throw new Error('글꼴 서브셋 실패');

console.log(`[fonts] ${Object.values(cssFor).join(', ')}\n  ${log.join('\n  ')}`);
