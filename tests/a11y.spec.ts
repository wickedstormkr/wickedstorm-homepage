/**
 * axe 접근성 점검(WCAG 2.2 AA 규칙 묶음, KWCAG 2.2 대응). 모든 페이지 × 폰(390)·데스크톱(1280).
 * 위반은 test-results/axe/<페이지>@<폭>.json 에 남긴다.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL, LOCALE } from './pages';

mkdirSync('test-results/axe', { recursive: true });

for (const pg of ALL) {
  for (const w of [390, 1280]) {
    test(`axe ${pg.id} @${w}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, locale: LOCALE[pg.lang] });
      const page = await ctx.newPage();
      await page.goto(pg.path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
      const v = r.violations.map((x) => ({ id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.slice(0, 5).map((n) => n.target.join(' ')) }));
      writeFileSync(`test-results/axe/${pg.id}@${w}.json`, JSON.stringify({ page: pg.id, width: w, violations: v }, null, 1));
      await ctx.close();
      expect(v, JSON.stringify(v, null, 1)).toEqual([]);
    });
  }
}
