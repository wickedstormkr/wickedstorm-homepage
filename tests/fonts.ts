import type { Page } from '@playwright/test';
/** 글꼴은 페이지 load 뒤에 적용된다(Base.astro #wsFonts). 적용되고 글꼴 파일까지 받은 뒤에 잰다 */
export async function waitForFonts(page: Page) {
  await page.waitForFunction(() => (document.getElementById('wsFonts') as HTMLLinkElement | null)?.media !== 'print');
  await page.evaluate(async () => { void document.body.offsetHeight; await document.fonts.ready; });
}
