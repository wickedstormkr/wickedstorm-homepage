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

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`scene 2 @${viewport.width}: the live panel and the ledger share one screen, and a new statement writes a ledger row`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('');
    await waitForFonts(page);
    await expect(page.locator('html')).toHaveClass(/art-live/, { timeout: 15000 });
    await page.evaluate(() => {
      const w = window as Window & { __writes?: number[] };
      w.__writes = [];
      document.querySelector('#story')!.addEventListener('story:write', (e) => w.__writes!.push((e as CustomEvent<{ row: number }>).detail.row));
    });
    await page.locator('.story-nav a[data-go="1"]').click();
    await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('1.00');
    const scene = page.locator('#scene-statement');
    const live = scene.locator('.live');
    await expect(live).toBeVisible();
    await expect(scene.locator('.ledger-box')).toBeVisible();
    // 창의 네 칸 = 기록 행의 네 칸(같은 순서)
    await expect(live.locator('.xrow').first().locator('.chip')).toHaveClass([/actor/, /verb/, /object/, /result/]);
    await expect(scene.locator('.ledger-cols > div')).toHaveCount(4);
    const panel = (await live.boundingBox())!;
    const ledger = (await scene.locator('.ledger-box').boundingBox())!;
    const controls = (await page.locator('.story-ui').boundingBox())!;
    if (viewport.width >= 1024) {
      // 넓은 화면: 창 | 기록 행, 한 화면 안(이야기 조작 위)
      expect(panel.x + panel.width).toBeLessThanOrEqual(ledger.x);
      expect(Math.max(panel.y + panel.height, ledger.y + ledger.height)).toBeLessThanOrEqual(controls.y);
    } else {
      // 폰: 창 위 · 기록 행 아래. 기록 행의 첫 줄이 이야기 조작 위에 보인다(끝까지는 읽을 스크롤로)
      expect(panel.y + panel.height).toBeLessThanOrEqual(ledger.y);
      expect(ledger.y + ledger.height / 12).toBeLessThanOrEqual(controls.y);
    }
    // 새 문장의 네 칸이 기록 행으로 날아가 한 줄을 다시 쓴다
    await expect(page.locator('.live-fly .ghost').first()).toBeAttached({ timeout: 8000 });
    await expect.poll(() => page.evaluate(() => (window as Window & { __writes?: number[] }).__writes!.length), { timeout: 8000 }).toBeGreaterThan(0);
    const counted = Number((await live.locator('[data-live-count]').innerText()).replace(/[^0-9]/g, ''));
    expect(counted).toBeGreaterThan(1374);
  });
}

test('pausing motion stops new statements in scene 2', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('');
  await expect(page.locator('html')).toHaveClass(/art-live/, { timeout: 15000 });
  await page.locator('.story-ctrl [data-motion-btn]').click();
  await page.locator('.story-nav a[data-go="1"]').click();
  await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('1.00');
  const before = await page.locator('[data-live-count]').innerText();
  await page.waitForTimeout(5000);
  await expect(page.locator('[data-live-count]')).toHaveText(before);
  await expect(page.locator('.live-fly .ghost')).toHaveCount(0);
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
