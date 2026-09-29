/**
 * 동작 점검: 움직임 멈춤(KWCAG 6.2.2, 오프닝 이야기 조작 안), 오프닝 이야기(고정·세로 장면, 키보드, 아래로 · 건너뛰기), 맨 위로, 언어 안내 띠(자동 이동 없음), 모바일 메뉴,
 * 문의 폼(서버 계약 그대로, 목적 · 유입 기록 · GA4 이벤트).
 * 문의 폼 전송은 실제 서버로 보내지 않고 가로채서 보내는 값만 확인한다.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { CONTACT_API } from '../src/config/client';

/** 문의 폼이 실제로 보내는 주소(설정과 같게: 주소를 옮겨도 가짜 응답이 따라간다) */
const ENDPOINT = CONTACT_API;

/** 문의 전송을 가로채 보낸 값을 돌려준다(실제 서버로 보내지 않는다) */
function catchSubmit(page: Page): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    page.route(ENDPOINT, async (route) => {
      resolve(JSON.parse(route.request().postData() ?? '{}'));
      await route.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } });
    });
  });
}
/** GA4 자리: gtag 호출을 window.__ga에 모은다(점검 빌드에는 GA가 실리지 않는다) */
async function stubGa(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __ga: unknown[][]; gtag: (...a: unknown[]) => void };
    w.__ga = [];
    w.gtag = (...a: unknown[]) => { w.__ga.push(a); };
  });
}
async function fillForm(f: Locator, v: { name: string; company: string; email: string; memo: string }) {
  await f.locator('[name=userName]').fill(v.name);
  await f.locator('[name=userCompany]').fill(v.company);
  await f.locator('[name=userEmail]').fill(v.email);
  await f.locator('[name=userMemo]').fill(v.memo);
  await f.locator('[name=checkPrivacy]').check();
}

test.describe('움직임 멈춤', () => {
  test('버튼이 데이터 아트의 떠다님을 멈추고, 선택을 기억한다', async ({ page }) => {
    await page.goto('');
    const btn = page.locator('.story-ctrl [data-motion-btn]');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    const story = page.locator('#story');
    await expect(story).toHaveAttribute('data-ambient', 'on', { timeout: 15000 });
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await expect(story).toHaveAttribute('data-ambient', 'off');
    await page.reload();
    await expect(page.locator('.story-ctrl [data-motion-btn]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('움직임 멈춤은 헤더가 아니라 오프닝 이야기 조작에 있다(저절로 움직이는 것은 오프닝에만 있다)', async ({ page }) => {
    await page.goto('');
    await expect(page.locator('header [data-motion-btn]')).toHaveCount(0);
    await expect(page.locator('.story-ctrl [data-motion-btn]')).toBeVisible();
  });

  test('움직임 줄이기 설정이면 멈춘 상태로 시작한다', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('');
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await expect(page.locator('.story-ctrl [data-motion-btn]')).toHaveAttribute('aria-pressed', 'true');
    await ctx.close();
  });

  test('움직임 줄이기면 장면을 고정하지 않고 세로로 이어 보인다', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('');
    await expect(page.locator('html')).not.toHaveClass(/story-pin/);
    await page.locator('#scene-judge').scrollIntoViewIfNeeded();
    await expect(page.locator('#scene-judge .fx-design')).toBeVisible();
    await expect(page.locator('#scene-judge .fx-design')).toHaveCSS('opacity', '1');
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

  test('데스크톱: 내려갔다가 처음으로 돌아오면 앞 장면 글이 남지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('');
    await expect(page.locator('html')).toHaveClass(/story-enhanced/, { timeout: 8000 });
    const op = (sel: string) => page.locator(sel).evaluate((el) => Number(getComputedStyle(el).opacity));
    // 장면 2 글이 반쯤 들어온 자리(s ≈ 0.62)와 장면 3 한가운데를 거쳐 맨 위로
    for (const s of [0.62, 2.1, 0]) {
      await page.evaluate((v) => {
        const st = document.querySelector<HTMLElement>('#story')!;
        window.scrollTo(0, st.offsetTop + ((st.offsetHeight - innerHeight) * v) / 5);
      }, s);
      await page.waitForTimeout(1500);
    }
    await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('0.00');
    expect(await op('#scene-moment .scene-copy')).toBe(1);
    for (const id of ['statement', 'store', 'signal', 'judge', 'next']) {
      expect(await op(`#scene-${id} .scene-copy`), id).toBe(0);
      expect(await op(`#scene-${id} .scene-visual`), id).toBe(0);
    }
    // 안전장치: 먼 장면은 잘라서 그리지 않는다(투명도 값이 남아도 겹쳐 보일 수 없다)
    for (const id of ['store', 'signal', 'judge', 'next']) {
      await expect(page.locator(`#scene-${id}`)).toHaveAttribute('data-far', '');
      await expect(page.locator(`#scene-${id} .scene-copy`)).toHaveCSS('clip-path', 'inset(50%)');
    }
  });

  test('데스크톱: 아래로는 다음 장면으로, 이야기 건너뛰기는 이야기 뒤로 바로 가고 초점도 옮긴다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('');
    await expect(page.locator('html')).toHaveClass(/story-enhanced/, { timeout: 8000 });
    await page.locator('[data-story-next]').click();
    await expect.poll(() => page.locator('#story').getAttribute('data-s'), { timeout: 8000 }).toBe('1.00');
    await expect(page.locator('#scene-statement')).toHaveClass(/is-active/);
    await page.locator('[data-story-skip]').click();
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('after-story')!.getBoundingClientRect().top)), { timeout: 8000 }).toBeLessThan(2);
    await expect(page.locator('#after-story')).toBeFocused();
  });

  test('맨 위로: 한 화면 넘게 내려가면 보이고, 고정된 이야기 안에서는 숨고, 누르면 맨 위로', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('');
    const btn = page.locator('#toTop');
    await expect(btn).toBeHidden();
    await page.evaluate(() => { const st = document.getElementById('story')!; window.scrollTo(0, st.offsetTop + innerHeight * 2); });
    await page.waitForTimeout(400);
    await expect(btn).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.getElementById('after-story')!.getBoundingClientRect().top + scrollY + 200));
    await expect(btn).toBeVisible();
    await btn.click();
    await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 8000 }).toBe(0);
  });

  test('폰: 공통 Canvas와 장면 이동을 사용하고 터치 스크롤은 기본 동작을 유지한다', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('');
    await expect(page.locator('html')).toHaveClass(/story-pin/);
    await expect(page.locator('html')).toHaveClass(/art-live/, { timeout: 15000 });
    await expect(page.locator('html')).not.toHaveClass(/lenis/);
    await page.locator('.story-nav a[data-go="2"]').click();
    await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('2.00');
    await expect(page.locator('#scene-store .case-pins li').first()).toBeVisible();
    await expect(page.locator('#scene-store .case-list')).toBeVisible();
    await page.locator('.story-nav a[data-go="5"]').click();
    await expect.poll(() => page.locator('#story').getAttribute('data-s')).toBe('5.00');
    await expect(page.locator('#scene-next .ring-labels li').first()).toBeVisible();
    const before = await page.evaluate(() => scrollY);
    await page.evaluate(() => {
      const w = window as Window & { __scrolls?: string[] };
      w.__scrolls = [];
      addEventListener('scroll', (e) => w.__scrolls!.push(`${(e.target as Element).nodeName ?? 'doc'}:${Math.round(scrollY)}`), { capture: true, passive: true });
    });
    const cdp = await ctx.newCDPSession(page);
    // 손가락으로 끌어 올리기: 실제 터치 이벤트(시작 · 이동 · 끝). synthesizeScrollGesture는 리눅스 헤드리스에서 스크롤을 만들지 않았다
    const point = (y: number) => [{ x: 200, y }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(300) });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(300 + i * 25) });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    // 실패하면 손가락 아래 요소와 그 조상의 touch-action · 스크롤 상태를 함께 적는다(리눅스 CI에서만 나던 실패의 원인 찾기)
    const why = () => page.evaluate(() => {
      const chain: string[] = [];
      for (let el = document.elementFromPoint(200, 300); el; el = el.parentElement) {
        const cs = getComputedStyle(el);
        const scrolls = el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(cs.overflowY);
        if (cs.touchAction !== 'auto' || scrolls || el === document.elementFromPoint(200, 300)) chain.push(`${el.nodeName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} ta=${cs.touchAction} oy=${cs.overflowY}${scrolls ? ' scrolls' : ''}`);
      }
      const w = window as Window & { __scrolls?: string[] };
      return `scrollY=${scrollY} max=${document.documentElement.scrollHeight - innerHeight} vv=${visualViewport?.scale} events=${w.__scrolls?.slice(0, 8).join(',')} | ${chain.join(' < ')}`;
    });
    await expect.poll(() => page.evaluate(() => scrollY), { message: 'touch scroll' }).toBeLessThan(before - 100).catch(async (e) => { throw new Error(`${e.message}\n${await why()}`); });
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

test.describe('숨긴 페이지(제품 · 사례)', () => {
  test('메뉴 · 푸터 · 홈 버튼 · 사이트맵에 없고, 주소로 열면 검색 제외 표시가 있다', async ({ page, request }) => {
    await page.goto('');
    const hidden = /\/(product|cases)\.html/;
    for (const sel of ['.site-header nav.main a', '#drawer a', '.site-footer a', '#product a', '#references a']) {
      const hrefs = await page.locator(sel).evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      expect(hrefs.filter((h) => hidden.test(h)), sel).toEqual([]);
    }
    const sitemap = await (await request.get('sitemap.xml')).text();
    expect(sitemap).not.toMatch(/<loc>[^<]*\/(product|cases)\.html<\/loc>/);
    for (const path of ['product.html', 'en/cases.html']) {
      await page.goto(path);
      await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
    }
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

  test('지금 서버와 같은 값 이름으로 보내고, 제목은 [웹 문의 · 언어] 소속 · 이름(영문 페이지, 직접 입력)', async ({ page }) => {
    const sent = catchSubmit(page);
    await page.goto('en/index.html#contact');
    const f = page.locator('#cform');
    await fillForm(f, { name: 'Kim', company: 'Hanoi Univ', email: 'kim@example.com', memo: 'Demo please' });
    await f.locator('[name=userTraffic]').selectOption('direct');
    await expect(f.locator('[data-etc]')).toBeVisible();
    await f.locator('[name=userTrafficEtc]').fill('VIETEDU booth');
    await f.locator('[data-submit]').click();
    await expect(f.locator('[data-status]')).toHaveText('Your inquiry has been received. We will get back to you soon.');
    const body = await sent;
    expect(Object.keys(body).sort()).toEqual(['affiliation', 'email', 'inquiry', 'name', 'subject', 'userTraffic', 'userTrafficEtc']);
    expect(body).toMatchObject({ name: 'Kim', affiliation: 'Hanoi Univ', email: 'kim@example.com', userTraffic: 'direct', userTrafficEtc: 'VIETEDU booth', subject: '[웹 문의 · EN] Hanoi Univ · Kim' });
    expect(body.inquiry).toMatch(/^Demo please\n\n-{40}\n\[접수 정보\] 홈페이지가 자동으로 붙인 정보입니다\.\n접수 번호: WS-\d{6}-[A-HJ-NP-Z2-9]{4}\n문의 목적: 고르지 않음\n/);
    expect(body.inquiry).toContain('문의 언어: 영어 (/en/index.html)');
    expect(body.inquiry).toContain('유입 경로(응답): 직접 입력: VIETEDU booth');
  });

  test('목적 카드는 라디오: 고르면 안내 글이 바뀌고, 제목 · 접수 정보 · GA4 이벤트에 목적이 실린다(이름 · 이메일 등은 GA4로 가지 않는다)', async ({ page }) => {
    await stubGa(page);
    const sent = catchSubmit(page);
    await page.goto('contact.html');
    const memo = page.locator('#cform [name=userMemo]');
    const demo = page.locator('input[name=purpose][value=demo]');
    await page.locator('.purpose').nth(1).click();
    await expect(demo).toBeChecked();
    await expect(memo).toHaveAttribute('placeholder', '희망 일시, 참석 인원, 관심 제품 등');
    await demo.press('ArrowRight');
    await expect(page.locator('input[name=purpose][value=partner]')).toBeChecked();
    await page.locator('.purpose').nth(1).click();
    const f = page.locator('#cform');
    await fillForm(f, { name: '홍길동', company: '서울시교육청', email: 'hong@example.com', memo: '10월 둘째 주 시연 희망' });
    await f.locator('[name=userTraffic]').selectOption('portal');
    await f.locator('[data-submit]').click();
    await expect(f.locator('[data-status]')).toHaveText('문의가 접수되었습니다. 빠른 시일 내 답변드리겠습니다.');
    const body = await sent;
    expect(body.subject).toBe('[웹 문의 · 시연 요청] 서울시교육청 · 홍길동');
    expect(body.inquiry).toMatch(/^10월 둘째 주 시연 희망\n\n/);
    expect(body.inquiry).toContain('문의 목적: 시연 요청');
    expect(body.inquiry).toContain('문의한 곳: 문의 페이지 · 문의 칸에서 바로 (contact#form)');
    expect(body.inquiry).toMatch(/\n유입 경로\(응답\): 포털 검색$/);
    const id = /접수 번호: (WS-\d{6}-[A-HJ-NP-Z2-9]{4})/.exec(body.inquiry)?.[1];
    const ga = await page.evaluate(() => (window as unknown as { __ga: unknown[][] }).__ga);
    const events = ga.filter((c) => c[0] === 'event');
    expect(events.map((c) => c[1])).toEqual(['contact_start', 'generate_lead']);
    expect(events[1][2]).toEqual({ lead_id: id, purpose: 'demo', entry: 'contact#form', form_lang: 'ko', traffic: 'portal' });
    expect(JSON.stringify(ga)).not.toMatch(/홍길동|hong@example\.com|서울시교육청/);
    // 접수 뒤: 목적과 안내 글이 처음으로
    await expect(demo).not.toBeChecked();
    await expect(memo).toHaveAttribute('placeholder', '도입 목적, 연계 대상, 일정 등');
  });

  test('다른 페이지의 시연 요청 버튼에서 오면 목적 · 제품 · 누른 곳 · 캠페인을 이어받는다(영문, 박람회 QR)', async ({ page }) => {
    const sent = catchSubmit(page);
    await page.goto('en/product.html?utm_source=fair&utm_medium=print&utm_campaign=vietedu-2026&utm_content=booth');
    await page.locator('#learnhubble a[data-purpose=demo]').click();
    await page.waitForURL(/\/en\/contact\.html/);
    await expect(page.locator('input[name=purpose][value=demo]')).toBeChecked();
    const sel = page.locator('#cform select[name=userTraffic]');
    expect(await sel.evaluate((s: HTMLSelectElement) => s.options[s.selectedIndex].dataset.auto)).toBe('박람회·행사');
    const f = page.locator('#cform');
    await fillForm(f, { name: 'Kim', company: 'Hanoi Univ', email: 'kim@example.com', memo: 'Next week' });
    await f.locator('[data-submit]').click();
    const body = await sent;
    expect(body.subject).toBe('[웹 문의 · 시연 요청 · LearnHubble AI · EN] Hanoi Univ · Kim');
    expect(body.inquiry).toContain('관심 제품: LearnHubble AI');
    expect(body.inquiry).toContain('문의한 곳: 제품 · LearnHubble AI 시연 요청 (product#learnhubble)');
    expect(body.inquiry).toMatch(/이번 유입: fair \/ print \/ vietedu-2026 · booth \(\d{4}-\d{2}-\d{2}, 첫 페이지 \/en\/product\.html\)/);
    expect(body.inquiry).toContain('유입 경로(응답): 박람회·행사 (방문 경로로 미리 선택됨)');
    expect(body).toMatchObject({ userTraffic: 'etc', userTrafficEtc: '박람회·행사' });
  });

  test('주소의 ?purpose=partner로 오면 파트너십이 골라지고 안내 글이 그 언어로 바뀐다(베트남어)', async ({ page }) => {
    await page.goto('vi/contact.html?purpose=partner');
    await expect(page.locator('input[name=purpose][value=partner]')).toBeChecked();
    await expect(page.locator('#cform [name=userMemo]')).toHaveAttribute('placeholder', 'Quốc gia và công ty, hình thức hợp tác (phân phối, dự án chung, hội chợ), v.v.');
  });

  test('홈의 오프닝 마지막 장면 시연 요청은 같은 페이지 문의의 목적을 고른다', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('');
    await page.locator('#scene-next a[data-purpose=demo]').click();
    await expect(page.locator('#contact input[name=purpose][value=demo]')).toBeChecked();
    const entry = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ws-entry') ?? '{}'));
    expect(entry).toMatchObject({ page: 'home', area: 'scene-next', purpose: 'demo' });
    await ctx.close();
  });

  test('거쳐 온 사이트로 유입을 나눈다(인스타그램 앱 링크 → 유입 경로 미리 선택)', async ({ page }) => {
    await page.goto('#contact', { referer: 'https://l.instagram.com/' });
    const visit = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ws-visit') ?? '{}'));
    expect(visit).toMatchObject({ src: 'instagram', med: 'social', ref: 'l.instagram.com', land: '/' });
    const sel = page.locator('#cform select[name=userTraffic]');
    expect(await sel.evaluate((s: HTMLSelectElement) => s.options[s.selectedIndex].dataset.auto)).toBe('인스타그램');
  });
});
