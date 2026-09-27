/**
 * 글꼴 점검: 모든 페이지(네 언어)의 글자가 사이트가 싣는 글꼴로만 그려지는지 본다.
 * 시스템 글꼴(맥 Hiragino·Menlo, 리눅스 Noto·DejaVu 등)로 떨어지는 글자가 있으면 기기마다 글자 폭이 달라져
 * 줄바꿈이 바뀐다(맥에서 통과하고 CI에서 실패하던 원인). 실제로 그린 글꼴은 Chrome에 묻는다(CDP CSS.getPlatformFontsForNode).
 * 한 요소 안에서 Sora와 Pretendard가 섞이는 것은 한글·한자 옆 숫자처럼 의도한 경우만 허용하고, 라틴 낱말 안에서 섞이면 실패로 본다.
 */
import { test, expect } from '@playwright/test';
import { waitForFonts } from './fonts';
import { ALL, LOCALE } from './pages';

const BUNDLED = new Set(['Pretendard Variable', 'Pretendard JP Variable', 'Sora', 'JetBrains Mono']);

for (const pg of ALL) {
  test(`글꼴 ${pg.id}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: LOCALE[pg.lang], reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(pg.path, { waitUntil: 'load' });
    await waitForFonts(page);
    // 글자를 직접 가진 요소마다 표시를 붙인다(숨은 요소 제외)
    const count = await page.evaluate(() => {
      let n = 0;
      for (const el of document.body.querySelectorAll('*')) {
        if (el.closest('script,style,noscript,template,svg title')) continue;
        const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent!.trim());
        if (!own || !(el as HTMLElement).getClientRects().length) continue;
        el.setAttribute('data-glyph-probe', String(n++));
      }
      return n;
    });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-glyph-probe]' });
    const foreign: string[] = [];
    const mixed: string[] = [];
    for (const nodeId of nodeIds) {
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      const bad = fonts.filter((f) => !BUNDLED.has(f.familyName));
      const soraMix = fonts.some((f) => f.familyName === 'Sora') && fonts.some((f) => f.familyName.startsWith('Pretendard'));
      if (!bad.length && !soraMix) continue;
      const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId });
      const text = outerHTML.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (bad.length) foreign.push(`${bad.map((f) => `${f.familyName}×${f.glyphCount}`).join(', ')}: "${text}"`);
      // 라틴 낱말 안에서 섞이면(베트남어 성조 글자 등) 한 낱말이 두 글꼴로 그려진다
      else if (/[A-Za-z][À-ɏḀ-ỿ]|[À-ɏḀ-ỿ][A-Za-z]/.test(text)) mixed.push(`"${text}"`);
    }
    await ctx.close();
    expect(count).toBeGreaterThan(0);
    expect({ foreign, mixed }, JSON.stringify({ foreign, mixed }, null, 1)).toEqual({ foreign: [], mixed: [] });
  });
}
