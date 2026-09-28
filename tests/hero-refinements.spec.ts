import { test, expect, type Page } from '@playwright/test';
import { waitForFonts } from './fonts';

/** Count rendered text rows, including text split by emphasis and typesetting spans. */
function textLayout(el: Element) {
  const lines: number[] = [];
  let textLeft = Infinity;
  let textRight = -Infinity;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (!rect.width || !rect.height) continue;
      textLeft = Math.min(textLeft, rect.left);
      textRight = Math.max(textRight, rect.right);
      if (lines.every(top => Math.abs(top - rect.top) > 2)) lines.push(rect.top);
    }
  }
  const bounds = el.getBoundingClientRect();
  return { lines: lines.sort((a, b) => a - b), left: bounds.left, right: bounds.right, top: bounds.top, textLeft, textRight };
}

async function openStory(page: Page, path = '') {
  await page.goto(path);
  await waitForFonts(page);
  await expect(page.locator('html')).toHaveClass(/art-live/, { timeout: 15_000 });
  const motion = page.locator('.story-ctrl [data-motion-btn]');
  if (await motion.getAttribute('aria-pressed') !== 'true') await motion.click();
}

async function scene(page: Page, index: number) {
  await page.locator(`.story-nav a[data-go="${index}"]`).click();
  await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe(`${index}.00`);
}

async function notificationRow(page: Page) {
  const alert = page.locator('.signal-notice > .signal-alert');
  await expect(alert.locator('.pname.lec')).toHaveText('Lecognizer AI');
  await expect(alert.locator('.signal-message')).toBeVisible();
  await expect(alert.locator('.signal-evidence')).toBeVisible();
  const text = await alert.evaluate(textLayout);
  expect(text.lines, 'The source, alert and evidence should share a single readable line').toHaveLength(1);
  expect(text.textLeft).toBeGreaterThanOrEqual(text.left - 1);
  expect(text.textRight).toBeLessThanOrEqual(text.right + 1);
  expect(text.right).toBeLessThanOrEqual(await page.evaluate(() => innerWidth) + 1);
  expect(await alert.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
}

async function ledgerRow(page: Page) {
  const list = page.locator('.ledger-items[data-fit]');
  await expect(list).toBeVisible();
  await expect(list.locator('li')).toHaveCount(8);
  const items = await list.locator('li:visible').all();
  expect(items.length).toBeGreaterThanOrEqual(2);
  const ledger = (await page.locator('.ledger').boundingBox())!;
  const box = (await page.locator('.ledger-foot').boundingBox())!;
  const row = (await list.boundingBox())!;
  const rightGap = ledger.x + ledger.width - box.x - box.width;
  expect(rightGap).toBeGreaterThanOrEqual(-1);
  expect(rightGap).toBeLessThanOrEqual(ledger.width * 0.1 + 1);
  const viewportWidth = await page.evaluate(() => innerWidth);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
  const overflow = await list.evaluate(el => el.scrollWidth - el.clientWidth);
  expect(overflow, 'The displayed row should contain whole items without clipping').toBeLessThanOrEqual(1);
  let top: number | undefined;
  for (const item of items) {
    const bounds = (await item.boundingBox())!;
    top ??= bounds.y;
    expect(Math.abs(bounds.y - top), 'All visible extra-information items should share one row').toBeLessThanOrEqual(1);
    expect(bounds.x).toBeGreaterThanOrEqual(Math.max(row.x, box.x) - 1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(Math.min(row.x + row.width, box.x + box.width, viewportWidth) + 1);
    expect((await item.evaluate(textLayout)).lines).toHaveLength(1);
  }
  const connector = await page.locator('.ledger-foot').evaluate(el => {
    const style = getComputedStyle(el, '::before');
    return {
      content: style.content,
      height: parseFloat(style.height),
      line: parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth),
      display: style.display,
    };
  });
  expect(connector.content).not.toBe('none');
  expect(connector.display).not.toBe('none');
  expect(connector.height).toBeGreaterThan(0);
  expect(connector.line).toBeGreaterThan(0);
  return items.length;
}

for (const width of [360, 390, 820, 1440, 1920]) {
  test(`hero refinements @${width}: consistent headings and readable composition`, async ({ page }) => {
    const height = width < 700 ? 844 : width < 1024 ? 1100 : 900;
    await page.setViewportSize({ width, height });
    await openStory(page);

    const sizes = await page.locator('.home-page :is(#hero-title,.scene-title,.sec-head .h-lg)').evaluateAll(elements =>
      elements.map(el => ({ id: el.id, size: parseFloat(getComputedStyle(el).fontSize) })),
    );
    expect(sizes).toHaveLength(13);
    for (const title of sizes) {
      expect(title.size, title.id).toBeCloseTo(sizes[0].size, 2);
      expect(title.size, title.id).toBeGreaterThanOrEqual(26);
      expect(title.size, title.id).toBeLessThanOrEqual(44);
    }
    expect((await page.locator('#hero-title').evaluate(textLayout)).lines).toHaveLength(2);

    // 첫 화면은 문구와 두 버튼만: 제품 창 · 증빙 목록을 두지 않고, 버튼은 이야기 조작 위에 다 보인다
    const first = page.locator('.scene-moment');
    await expect(first.locator('.scene-visual, .live, .hero-trust')).toHaveCount(0);
    await expect(first.locator('.eyebrow')).toBeVisible();
    await expect(first.locator('.hero-lead')).toBeVisible();
    await expect(first.locator('.hero-cta .btn')).toHaveCount(2);
    const controls = (await page.locator('.story-ui').boundingBox())!;
    for (const button of await first.locator('.hero-cta .btn').all()) {
      const box = (await button.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(controls.y);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }

    await scene(page, 1);
    const composition = await page.locator('.scene-statement').evaluate(el => {
      const copy = el.querySelector('.scene-copy')!.getBoundingClientRect();
      const visual = el.querySelector('.scene-visual')!.getBoundingClientRect();
      return { copyBottom: copy.bottom, visualTop: visual.top };
    });
    expect(composition.copyBottom).toBeLessThanOrEqual(composition.visualTop);
    const extraCount = await ledgerRow(page);
    if (width >= 1440) expect(extraCount).toBe(8);
    if (width <= 390) expect(extraCount).toBeLessThan(8);

    await scene(page, 4);
    const notification = page.locator('.signal-notice > [data-notification-icon]');
    await expect(notification).toBeVisible();
    await expect(page.locator('.signal-notice > .signal-alert')).toBeVisible();
    await expect(page.locator('.signal-alert [data-notification-icon]')).toHaveCount(0);
    const icon = (await notification.boundingBox())!;
    const alert = (await page.locator('.signal-notice > .signal-alert').boundingBox())!;
    const overlapX = Math.min(icon.x + icon.width, alert.x + alert.width) - Math.max(icon.x, alert.x);
    const overlapY = Math.min(icon.y + icon.height, alert.y + alert.height) - Math.max(icon.y, alert.y);
    expect(overlapX <= 1 || overlapY <= 1, 'The bell should sit outside the alert box').toBe(true);
    expect(icon.width).toBeGreaterThanOrEqual(30);
    expect(icon.width).toBeLessThanOrEqual(34);
    expect(icon.width).toBeCloseTo(icon.height, 0);
    expect(icon.x).toBeGreaterThanOrEqual(0);
    expect(icon.y).toBeGreaterThanOrEqual(0);
    expect(icon.x + icon.width).toBeLessThanOrEqual(width + 1);
    expect(icon.y + icon.height).toBeLessThanOrEqual(height + 1);
    await notificationRow(page);
  });
}

test('the compact ledger and notification rows remain readable in every language', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, opening] of [['', '학습의'], ['en/', 'Every Learning'], ['ja/', '学びの'], ['vi/', 'Biến']]) {
    await openStory(page, path);
    await expect(page.locator('#hero-title')).toContainText(opening);
    await scene(page, 1);
    const label = (await page.locator('#ledger-extra-column').innerText()).trim();
    const group = page.locator('.ledger-foot');
    const list = group.locator('.ledger-items');
    await expect(group).toHaveAttribute('role', 'group');
    await expect(group).toHaveAttribute('aria-labelledby', 'ledger-extra-column');
    await expect(list).toHaveAttribute('aria-labelledby', 'ledger-extra-column');
    await expect(group).toHaveAccessibleName(new RegExp(label));
    await expect(list).toHaveAccessibleName(new RegExp(label));
    await expect(group.locator('.ledger-extra-title:visible,.ledger-rest:visible')).toHaveCount(0);
    expect(await ledgerRow(page)).toBeLessThan(8);
    await scene(page, 4);
    await notificationRow(page);
  }
});
