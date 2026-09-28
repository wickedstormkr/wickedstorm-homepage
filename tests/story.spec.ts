import { test, expect } from '@playwright/test';
import { waitForFonts } from './fonts';

for (const lang of ['', 'en/', 'ja/', 'vi/']) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1100 }, { width: 1440, height: 900 }]) {
    test(`shared story ${lang || 'ko'} ${viewport.width}: all six scenes remain readable`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(lang);
      await waitForFonts(page);
      await expect(page.locator('html')).toHaveClass(/art-live/, { timeout: 15000 });
      await page.locator('.story-ctrl [data-motion-btn]').click();
      for (let i = 0; i < 6; i++) {
        await page.locator(`.story-nav a[data-go="${i}"]`).click();
        await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe(`${i}.00`);
        await expect(page.locator('.scene.is-active')).toHaveCount(1);
        const scene = page.locator(`.scene[data-scene="${i}"]`);
        await expect(scene).toHaveClass(/is-active/);
        // 장면 1(첫 문구)에는 그림 칸이 없다
        const geometry = await scene.evaluate((el) => {
          const box = (sel: string) => { const r = el.querySelector(sel)?.getBoundingClientRect(); return r ? [r.left, r.right] : null; };
          return { boxes: [box('h1,h2'), box('.scene-visual')].filter((b): b is number[] => !!b), width: innerWidth, doc: document.documentElement.scrollWidth };
        });
        expect(geometry.doc).toBeLessThanOrEqual(geometry.width);
        for (const [left, right] of geometry.boxes) {
          expect(left).toBeGreaterThanOrEqual(0);
          expect(right).toBeLessThanOrEqual(geometry.width + 1);
        }
      }
    });
  }
}

test('resizing across desktop/tablet/phone boundaries preserves the current scene', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('');
  await waitForFonts(page);
  await expect(page.locator('html')).toHaveClass(/art-live/);
  await page.locator('.story-ctrl [data-motion-btn]').click();
  await page.locator('.story-nav a[data-go="3"]').click();
  await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('3.00');
  for (const width of [1024, 1023, 960, 959, 820, 390, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    await expect(page.locator('html')).toHaveClass(/art-live/);
    await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('3.00');
    await expect(page.locator('#scene-signal')).toHaveClass(/is-active/);
  }
});

test('the first scene fits a short phone: copy and both buttons sit above the story controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto('');
  await waitForFonts(page);
  await expect(page.locator('html')).toHaveClass(/art-live/);
  await page.locator('.story-ctrl [data-motion-btn]').click();
  await expect(page.locator('.scene-moment .hero-cta .btn')).toHaveCount(2);
  const controls = (await page.locator('.story-ui').boundingBox())!;
  for (const button of await page.locator('.scene-moment .hero-cta .btn').all()) {
    const box = (await button.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(76);
    expect(box.y + box.height).toBeLessThanOrEqual(controls.y);
  }
  await page.locator('[data-story-next]').click();
  await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('1.00');
});

test('without JavaScript all six scenes and the mobile loop remain available', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('');
  await expect(page.locator('html')).not.toHaveClass(/story-pin/);
  await expect(page.locator('.scene')).toHaveCount(6);
  await expect(page.locator('.ring-labels li').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await context.close();
});

test('resize preserves a transition and the reading position below the story', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('');
  await waitForFonts(page);
  await expect(page.locator('html')).toHaveClass(/art-live/);
  await page.locator('.story-ctrl [data-motion-btn]').click();
  await page.locator('.story-nav a[data-go="2"]').click();
  await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('2.00');
  await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.story-stage')!;
    const scene = document.querySelector<HTMLElement>('#scene-store')!;
    scrollTo({ top: scrollY + scene.offsetHeight - stage.clientHeight + stage.clientHeight * 0.4, behavior: 'instant' });
  });
  await expect.poll(async () => Number(await page.locator('#story').getAttribute('data-s'))).toBeCloseTo(2.4, 1);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(async () => Number(await page.locator('#story').getAttribute('data-s'))).toBeCloseTo(2.4, 1);
  await page.evaluate(() => scrollTo({ top: document.getElementById('after-story')!.getBoundingClientRect().top + scrollY + 160, behavior: 'instant' }));
  await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('5.00');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('#after-story').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(-160);
});

test('changing the motion preference restores a readable document and the active scene', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('');
  await expect(page.locator('html')).toHaveClass(/art-live/);
  await page.locator('.story-nav a[data-go="3"]').click();
  await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('3.00');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/story-pin|art-live/);
  await expect.poll(() => page.locator('#scene-signal').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(80);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveClass(/art-live/);
  await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('3.00');
});

test('a failed renderer download keeps native navigation and SVG diagrams', async ({ page }) => {
  await page.route('**/enhance.*.js', route => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('');
  await expect(page.locator('html')).not.toHaveClass(/art-live/);
  await page.locator('.story-nav a[data-go="5"]').click();
  await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('5.00');
  await expect(page.locator('#scene-next .art-base')).toHaveCSS('opacity', '1');
  await expect(page.locator('#scene-next')).toHaveCSS('opacity', '1');
  await page.locator('[data-story-skip]').click();
  await expect(page.locator('#after-story')).toBeFocused();
});
