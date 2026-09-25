/**
 * 반응형 점검: 폭 9개 × 네 언어 홈 + 국문 페이지들.
 * 가로 넘침, 칸 밖 글자, 11px 미만 글자, 본문 15px(터치), 누르는 곳 44px(터치), 마지막 줄 한 단어.
 * 결과는 test-results/audit/<페이지>@<폭>.json 에도 남긴다(scripts/checks/report.mjs가 PR 요약표로 묶는다).
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { audit } from './audit/metrics';
import { ALL, WIDTHS, TOUCH_MAX, LOCALE, viewportHeight } from './pages';

mkdirSync('test-results/audit', { recursive: true });

for (const pg of ALL) {
  test.describe(pg.id, () => {
    for (const w of WIDTHS) {
      test(`${pg.id} @${w}`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: w, height: viewportHeight(w) }, locale: LOCALE[pg.lang], reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await page.goto(pg.path, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const r = await page.evaluate(audit, { touch: w <= TOUCH_MAX });
        writeFileSync(`test-results/audit/${pg.id}@${w}.json`, JSON.stringify({ page: pg.id, lang: pg.lang, width: w, ...r }, null, 1));
        await ctx.close();
        const problems = { overflow: r.overflow, outside: r.outside, small: r.small, body: r.body, tap: r.tap, orphan: r.orphan };
        const found = Object.entries(problems).filter(([, v]) => v.length);
        expect(found, JSON.stringify(Object.fromEntries(found), null, 1)).toEqual([]);
        expect(r.docW, '문서 폭이 화면보다 넓음').toBeLessThanOrEqual(r.vw);
      });
    }
  });
}
