/**
 * 동작 점검: 움직임 멈춤(KWCAG 6.2.2), 오프닝 이야기(고정·세로 장면, 키보드), 언어 안내 띠(자동 이동 없음), 모바일 메뉴, 문의 폼(서버 계약 그대로).
 * 문의 폼 전송은 실제 서버로 보내지 않고 가로채서 보내는 값만 확인한다.
 */
import { test, expect } from '@playwright/test';

const ENDPOINT = 'https://v6pa5eyigfdkbuzm2rskahdf6y0xfsre.lambda-url.ap-northeast-2.on.aws';

test.describe('움직임 멈춤', () => {
  test('버튼이 데이터 아트의 떠다님을 멈추고, 선택을 기억한다', async ({ page }) => {
    await page.goto('');
    const btn = page.locator('#motionBtn');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    const story = page.locator('#story');
    await expect(story).toHaveAttribute('data-ambient', 'on', { timeout: 15000 });
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await expect(story).toHaveAttribute('data-ambient', 'off');
    await page.reload();
    await expect(page.locator('#motionBtn')).toHaveAttribute('aria-pressed', 'true');
  });

  test('움직임 줄이기 설정이면 멈춘 상태로 시작한다', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('');
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await expect(page.locator('#motionBtn')).toHaveAttribute('aria-pressed', 'true');
    await ctx.close();
  });

  test('움직임 줄이기면 장면을 고정하지 않고 세로로 이어 보인다', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('');
    await expect(page.locator('html')).not.toHaveClass(/story-pin/);
    await page.locator('#scene-judge').scrollIntoViewIfNeeded();
    await expect(page.locator('#scene-judge .fx-judge')).toBeVisible();
    await expect(page.locator('#scene-judge .fx-judge')).toHaveCSS('opacity', '1');
    await ctx.close();
  });
});

test.describe('오프닝 이야기', () => {
  test('데스크톱: 장면 이동 목록으로 장면을 넘기고, 현재 장면을 알린다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('');
    await expect(page.locator('html')).toHaveClass(/story-pin/);
    const link = page.locator('.story-nav a[data-go="3"]');
    await link.click();
    await expect(link).toHaveAttribute('aria-current', 'step', { timeout: 8000 });
    await expect(page.locator('#scene-signal')).toHaveClass(/is-active/);
    await expect(page.locator('#scene-signal .fx-anom')).toBeInViewport();
  });

  test('데스크톱: 보이지 않는 장면의 링크로 초점이 가면 그 장면으로 넘어간다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('');
    await page.locator('#scene-next .btn.p').focus();
    await expect(page.locator('#scene-next')).toHaveClass(/is-active/, { timeout: 8000 });
  });

  test('폰: 장면을 세로로 잇고, 화면에 들어오면 그 장면의 움직임을 재생한다', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('');
    await expect(page.locator('html')).not.toHaveClass(/story-pin/);
    const sc = page.locator('#scene-statement');
    await expect(sc).not.toHaveClass(/play/);
    await sc.scrollIntoViewIfNeeded();
    await expect(sc).toHaveClass(/play/);
    await expect(page.locator('#scene-store .case-list')).toBeVisible();
    await expect(page.locator('#scene-store .art-labels')).toBeHidden();
    await ctx.close();
  });
});

test.describe('언어', () => {
  test('브라우저 언어가 다르면 안내 띠만 띄우고, 다른 페이지로 보내지 않는다', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'vi-VN' });
    const page = await ctx.newPage();
    await page.goto('');
    await expect(page).toHaveURL(/\/$/);
    const banner = page.locator('#langBanner');
    await expect(banner).toBeVisible();
    await expect(banner.locator('a')).toHaveAttribute('href', /vi\/index\.html$/);
    await expect(banner.locator('p')).toHaveAttribute('lang', 'vi');
    await banner.locator('[data-close]').click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.locator('#langBanner')).toBeHidden();
    await ctx.close();
  });

  test('브라우저 언어와 같은 페이지면 띄우지 않는다', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'ko-KR' });
    const page = await ctx.newPage();
    await page.goto('');
    await expect(page.locator('#langBanner')).toBeHidden();
    await ctx.close();
  });

  test('hreflang·canonical과 원어 이름 언어 선택', async ({ page }) => {
    await page.goto('en/index.html');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/en\/index\.html$/);
    for (const l of ['ko', 'en', 'ja', 'vi', 'x-default']) await expect(page.locator(`link[rel=alternate][hreflang="${l}"]`)).toHaveCount(1);
    const names = await page.locator('.lang-menu a').allTextContents();
    expect(names).toEqual(['한국어', 'English', '日本語', 'Tiếng Việt']);
  });
});

test.describe('모바일 메뉴', () => {
  test('열고, ESC로 닫는다', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto('');
    const btn = page.locator('#menuBtn');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#drawer')).toBeHidden();
    await ctx.close();
  });
});

test.describe('문의 폼', () => {
  test('비어 있으면 필드마다 오류를 붙이고 첫 필드로 이동', async ({ page }) => {
    await page.goto('#contact');
    await page.locator('#cform [data-submit]').click();
    await expect(page.locator('#err-userName')).toHaveText('이름을 입력해 주세요.');
    await expect(page.locator('#cform [name=userName]')).toBeFocused();
    await expect(page.locator('#cform [name=userName]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('utm_source=fair면 유입 경로가 박람회·행사로 골라진다', async ({ page }) => {
    await page.goto('?utm_source=fair#contact');
    const sel = page.locator('#cform select[name=userTraffic]');
    expect(await sel.evaluate((s: HTMLSelectElement) => s.options[s.selectedIndex].dataset.auto)).toBe('박람회·행사');
    await expect(page.locator('#cform [name=userTrafficEtc]')).toHaveValue('박람회·행사');
    await expect(page.locator('#cform [data-etc]')).toBeHidden();
  });

  test('지금 서버와 같은 값을 보낸다(영문 페이지, 직접 입력)', async ({ page }) => {
    let body: Record<string, string> | null = null;
    await page.route(ENDPOINT, async (route) => {
      body = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } });
    });
    await page.goto('en/index.html#contact');
    const f = page.locator('#cform');
    await f.locator('[name=userName]').fill('Kim');
    await f.locator('[name=userCompany]').fill('Hanoi Univ');
    await f.locator('[name=userEmail]').fill('kim@example.com');
    await f.locator('[name=userTraffic]').selectOption('direct');
    await expect(f.locator('[data-etc]')).toBeVisible();
    await f.locator('[name=userTrafficEtc]').fill('VIETEDU booth');
    await f.locator('[name=userMemo]').fill('Demo please');
    await f.locator('[name=checkPrivacy]').check();
    await f.locator('[data-submit]').click();
    await expect(f.locator('[data-status]')).toHaveText('Your inquiry has been received. We will get back to you soon.');
    expect(body).toEqual({
      name: 'Kim', affiliation: 'Hanoi Univ', email: 'kim@example.com', inquiry: 'Demo please',
      userTraffic: 'direct', userTrafficEtc: 'VIETEDU booth',
      subject: 'Contact Us 문의 접수 [EN]: Kim님 (소속: Hanoi Univ)',
    });
  });

  test('시연 요청 버튼은 문의사항 첫 줄을 채운다', async ({ page }) => {
    await page.goto('');
    await page.locator('.lhub-cta a[data-topic]').click();
    await expect(page.locator('#cform [name=userMemo]')).toHaveValue('LearnHubble AI 시연을 요청합니다.\n');
  });
});
