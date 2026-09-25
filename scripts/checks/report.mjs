#!/usr/bin/env node
/**
 * 점검 결과를 한 장의 표(Markdown)로 묶는다 → test-results/report.md
 * CI가 이 파일을 PR 댓글과 작업 요약에 남긴다. 로컬에서도 `npm run report`로 볼 수 있다.
 * 읽는 것: test-results/audit/*.json(반응형), test-results/axe/*.json, test-results/links.json,
 *          test-results/content.json, test-results/results.json(Playwright), .lighthouseci/lhr-*.json
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const lines = [];
const out = (s = '') => lines.push(s);
const WIDTHS = [360, 390, 430, 768, 820, 1024, 1280, 1440, 1920];
const KEYS = { overflow: '가로 넘침', outside: '칸 밖 글자', small: '11px 미만', body: '본문 15px', tap: '누르는 곳', orphan: '마지막 줄 한 단어' };

out('## 자동 점검 결과');
out();

/* 반응형 */
if (existsSync('test-results/audit')) {
  const rows = readdirSync('test-results/audit').map((f) => read(`test-results/audit/${f}`));
  const pages = [...new Set(rows.map((r) => r.page))];
  const total = rows.reduce((a, r) => a + Object.keys(KEYS).reduce((b, k) => b + r[k].length, 0), 0);
  out(`### 반응형(폭 ${WIDTHS.length}개 × 페이지 ${pages.length}개): ${total ? `❌ 문제 ${total}건` : '✅ 모두 통과'}`);
  out();
  out('가로 넘침 · 칸 밖 글자 · 11px 미만 글자 · 본문 15px(터치) · 누르는 곳 44px(터치) · 마지막 줄 한 단어. ✅ = 문제 0, 숫자 = 문제 수.');
  out();
  out(`| 페이지 | ${WIDTHS.join(' | ')} |`);
  out(`|---|${WIDTHS.map(() => '---').join('|')}|`);
  for (const p of pages) {
    const cells = WIDTHS.map((w) => {
      const r = rows.find((x) => x.page === p && x.width === w);
      if (!r) return '·';
      const n = Object.keys(KEYS).reduce((b, k) => b + r[k].length, 0);
      return n ? `❌ ${n}` : '✅';
    });
    out(`| ${p} | ${cells.join(' | ')} |`);
  }
  const bad = rows.filter((r) => Object.keys(KEYS).some((k) => r[k].length));
  if (bad.length) {
    out();
    out('<details><summary>문제 목록</summary>');
    out();
    for (const r of bad) for (const [k, label] of Object.entries(KEYS)) for (const x of r[k]) out(`- ${r.page}@${r.width} · ${label}: \`${x.replace(/`/g, "'")}\``);
    out();
    out('</details>');
  }
  out();
}

/* axe */
if (existsSync('test-results/axe')) {
  const rows = readdirSync('test-results/axe').map((f) => read(`test-results/axe/${f}`));
  const n = rows.reduce((a, r) => a + r.violations.length, 0);
  out(`### 접근성(axe, WCAG 2.2 AA 규칙, 페이지 ${new Set(rows.map((r) => r.page)).size}개 × 390·1280): ${n ? `❌ 위반 ${n}건` : '✅ 위반 0건'}`);
  for (const r of rows) for (const v of r.violations) out(`- ${r.page}@${r.width} · ${v.id}(${v.impact}): ${v.help}`);
  out();
}

/* Playwright 전체 */
if (existsSync('test-results/results.json')) {
  const j = read('test-results/results.json');
  const s = j.stats ?? {};
  out(`### 브라우저 테스트(Playwright): 통과 ${s.expected ?? 0} · 실패 ${s.unexpected ?? 0} · 불안정 ${s.flaky ?? 0}`);
  out('반응형 점검, axe, 동작 점검(움직임 멈춤, 언어 안내 띠, 모바일 메뉴, 문의 폼 서버 계약).');
  out();
}

/* 링크·콘텐츠 */
if (existsSync('test-results/links.json')) {
  const j = read('test-results/links.json');
  out(`### 깨진 링크(페이지 ${j.pages}개): ${j.broken.length ? `❌ ${j.broken.length}건` : '✅ 사이트 안 링크·자산·앵커 이상 없음'}`);
  for (const b of j.broken) out(`- ${b.page} → \`${b.ref}\` (${b.why})`);
  if (Array.isArray(j.external) && j.external.length && typeof j.external[0] === 'object') {
    const bad = j.external.filter((r) => r.status < 200 || r.status >= 400);
    out(`- 바깥 링크 ${j.external.length}개 중 응답 이상 ${bad.length}개(경고, 봇 차단 사이트 포함)`);
    for (const b of bad) out(`  - ${b.status} ${b.href}`);
  }
  out();
}
if (existsSync('test-results/content.json')) {
  const j = read('test-results/content.json');
  out(`### 콘텐츠 규칙(네 언어 모양, 긴 줄표, '개발 중', GROWA·LXP, 청록, 히어로 240만): ${j.errors.length ? `❌ ${j.errors.length}건` : '✅ 이상 없음'}`);
  for (const e of j.errors) out(`- ${e}`);
  out();
}

/* Lighthouse */
if (existsSync('.lighthouseci')) {
  const lhrs = readdirSync('.lighthouseci').filter((f) => /^lhr-.*\.json$/.test(f)).map((f) => read(`.lighthouseci/${f}`));
  if (lhrs.length) {
    const byUrl = new Map();
    for (const r of lhrs) {
      const u = new URL(r.finalDisplayedUrl).pathname;
      byUrl.set(u, [...(byUrl.get(u) ?? []), r]);
    }
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    let fail = false;
    const rows = [];
    for (const [u, rs] of byUrl) {
      const v = (id) => med(rs.map((r) => r.audits[id].numericValue));
      const js = med(rs.map((r) => r.audits['resource-summary'].details.items.find((i) => i.resourceType === 'script')?.transferSize ?? 0));
      const a11y = med(rs.map((r) => r.categories.accessibility.score));
      const lcp = v('largest-contentful-paint'), cls = v('cumulative-layout-shift'), tbt = v('total-blocking-time');
      const ok = lcp <= 2500 && cls <= 0.1 && tbt <= 200 && js <= 92160;
      if (!ok) fail = true;
      rows.push(`| ${u} | ${(lcp / 1000).toFixed(2)}s | ${cls.toFixed(3)} | ${Math.round(tbt)}ms | ${(js / 1024).toFixed(1)}KB | ${Math.round(a11y * 100)} | ${ok ? '✅' : '❌'} |`);
    }
    out(`### Lighthouse(폰, 중앙값 ${lhrs.length / byUrl.size}회): ${fail ? '❌ 예산 초과' : '✅ 예산 안'}`);
    out('예산: LCP ≤ 2.5s · CLS ≤ 0.1 · TBT ≤ 200ms(INP 대신) · 첫 로드 JS ≤ 90KB(gzip)');
    out();
    out('| 페이지 | LCP | CLS | TBT | JS | 접근성 | |');
    out('|---|---|---|---|---|---|---|');
    rows.forEach((r) => out(r));
    out();
  }
}

mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/report.md', lines.join('\n') + '\n');
console.log(lines.join('\n'));
