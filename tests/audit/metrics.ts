/**
 * 반응형 점검 지표. docs/redesign/responsive-audit.js(9월 25일 PR #1 측정 스크립트)를 테스트용으로 발전시켰다.
 * 브라우저 안에서 실행된다(page.evaluate). 바깥 변수를 쓰지 않는 한 덩어리 함수여야 한다.
 *
 * 보는 것
 *  1) overflow   가로 넘침: 화면 밖으로 나간 요소(스크롤 칸 안에 있는 것은 제외)
 *  2) outside    칸 밖 글자: 글자가 자기 칸(요소 상자) 밖으로 삐져나오거나 잘림
 *  3) small      11px 미만 글자(그림 속·장식 글자 포함, 화면에 보이는 모든 글자)
 *  4) body       본문 15px 미만(터치 폭 ≤1023, 40자 이상 문단만. CLAUDE.md '본문은 15px 이상')
 *  5) tap        누르는 곳 44×44px 미만(터치 폭 ≤1023만. 문장 속 링크는 WCAG 2.5.8 예외)
 *  6) orphan     마지막 줄 한 단어: 줄이 둘 이상인 글 칸의 마지막 줄에 한 단어만(일본어는 두 글자 이하)
 *                영·베·한은 띄어쓰기 단위로 센다. <br>로 직접 끊은 줄은 보지 않는다.
 */
export interface AuditResult {
  vw: number;
  docW: number;
  overflow: string[];
  outside: string[];
  small: string[];
  body: string[];
  tap: string[];
  orphan: string[];
}

export function audit(opts: { touch: boolean }): AuditResult {
  const vw = document.documentElement.clientWidth;
  const langOf = (el: Element) => (el.closest('[lang]')?.getAttribute('lang') || 'ko').slice(0, 2);
  const IGNORE = 'script,style,noscript,template,svg,canvas,video,[hidden],.sr-only,.hp,.drawer:not(.open),details:not([open]) > :not(summary)';
  // 화면 낭독기 전용(1px 잘라 숨김)인지
  const clipped = (el: Element) => {
    for (let p: Element | null = el; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return true;
    }
    return false;
  };
  const vis = (el: Element) => {
    if (el.closest(IGNORE)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !clipped(el);
  };
  const name = (el: Element) => {
    const id = el.id ? '#' + el.id : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '';
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    return `${el.tagName.toLowerCase()}${id}${cls}${txt ? ` "${txt}"` : ''}`;
  };
  const inScroller = (el: Element) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') {
        const pr = p.getBoundingClientRect();
        if (pr.right <= vw + 1 && pr.left >= -1) return true;
      }
      p = p.parentElement;
    }
    return false;
  };
  const out: AuditResult = { vw, docW: document.documentElement.scrollWidth, overflow: [], outside: [], small: [], body: [], tap: [], orphan: [] };

  /* 1) 가로 넘침 */
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) out.overflow.push(`${name(el)} L${Math.round(r.left)} R${Math.round(r.right)}`);
  }

  /* 글 칸(leaf block): 글자를 직접 가진 블록 요소. 안쪽 블록 요소의 글자는 그 요소가 따로 본다 */
  const isInlineLevel = (el: Element) => {
    const d = getComputedStyle(el).display;
    return d === 'inline' || d === 'contents';
  };
  const blockOf = (n: Node): Element | null => {
    let p = n.parentElement;
    while (p && isInlineLevel(p)) p = p.parentElement;
    return p;
  };
  type Tok = { text: string; rect: DOMRect; space: boolean; br: boolean };
  const blocks = new Map<Element, Tok[]>();
  const pendingSpace = new Map<Element, boolean>(); // 앞 글자와 띄어 썼는지
  const pendingBr = new Map<Element, boolean>(); // 앞에 <br>이 있었는지
  const JA_CHAR = /[^\s、。，．・「」『』（）()！？!?,.:：;；…—-]/gu;
  const WORD = /\S+/gu;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null;
  while ((n = tw.nextNode())) {
    if (n.nodeType === 1) {
      const el = n as Element;
      if (el.tagName === 'BR') { const b = blockOf(el); if (b) { pendingBr.set(b, true); pendingSpace.set(b, true); } }
      continue;
    }
    const t = n as Text;
    const s = t.data;
    const b = blockOf(t);
    if (!b) continue;
    if (!s.trim()) { pendingSpace.set(b, true); continue; }
    const host = t.parentElement;
    if (!host || !vis(host)) continue;
    const list = blocks.get(b) ?? [];
    blocks.set(b, list);
    const fs = parseFloat(getComputedStyle(host).fontSize);
    /* 3) 작은 글자 */
    if (fs < 11) out.small.push(`${name(host)} ${fs.toFixed(1)}px`);
    const isJa = langOf(host) === 'ja';
    const wordRe = isJa ? JA_CHAR : WORD;
    wordRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    let prevEnd = 0;
    while ((m = wordRe.exec(s))) {
      if (m.index > prevEnd) pendingSpace.set(b, true);
      prevEnd = m.index + m[0].length;
      const rg = document.createRange();
      rg.setStart(t, m.index);
      rg.setEnd(t, prevEnd);
      const rects = [...rg.getClientRects()].filter((r) => r.width > 0);
      if (!rects.length) continue;
      // 한 단어가 두 줄에 걸쳐 끊긴 경우 마지막 조각을 쓴다
      list.push({ text: m[0], rect: rects[rects.length - 1], space: isJa || list.length === 0 || (pendingSpace.get(b) ?? false), br: pendingBr.get(b) ?? false });
      pendingSpace.set(b, false);
      pendingBr.set(b, false);
    }
    if (/\s$/.test(s)) pendingSpace.set(b, true);
  }

  for (const [b, toks] of blocks) {
    if (!toks.length || !vis(b)) continue;
    const br = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    const fs = parseFloat(cs.fontSize);
    /* 2) 칸 밖 글자: 글자 상자가 요소 상자를 벗어남(1px 허용) */
    const bad = toks.find((k) => k.rect.right > br.right + 1.5 || k.rect.left < br.left - 1.5);
    if (bad) out.outside.push(`${name(b)} "${bad.text}" ${Math.round(bad.rect.left)}~${Math.round(bad.rect.right)} / 칸 ${Math.round(br.left)}~${Math.round(br.right)}`);
    // 부모 칸(overflow:hidden·clip)에 잘려 안 보이는 글자. 가로로 넘기는 칸(auto·scroll)은 넘겨 보면 되므로 제외
    else {
      for (let p = b.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'auto' || o === 'scroll') break;
        if (o !== 'hidden' && o !== 'clip') continue;
        const pr = p.getBoundingClientRect();
        const cut = toks.find((k) => k.rect.right > pr.right + 1.5 || k.rect.left < pr.left - 1.5);
        if (cut) out.outside.push(`${name(b)} "${cut.text}" 잘림(${name(p)})`);
        break;
      }
    }
    /* 4) 본문 15px */
    const text = (b.textContent || '').replace(/\s+/g, ' ').trim();
    // 대문자 라벨(아이브로우·기관명 라벨)은 본문이 아니다
    if (opts.touch && (b.tagName === 'P' || b.tagName === 'LI') && text.length >= 40 && fs < 15 && b.closest('main') && !b.closest('[aria-hidden="true"]') && cs.textTransform !== 'uppercase') {
      out.body.push(`${name(b)} ${fs}px`);
    }
    /* 6) 마지막 줄 한 단어 */
    // 띄어쓰기 없이 이어진 조각(인라인 태그로 나뉜 한 단어)은 한 단어로 합친다
    const words: Tok[] = [];
    for (const k of toks) {
      if (!k.space && words.length && Math.abs(words[words.length - 1].rect.top - k.rect.top) < fs * 0.6) continue;
      words.push(k);
    }
    const lines: Tok[][] = [];
    for (const w of words) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last[0].rect.top - w.rect.top) < fs * 0.6) last.push(w);
      else lines.push([w]);
    }
    if (lines.length < 2) continue;
    const lastLine = lines[lines.length - 1];
    if (lastLine[0].br) continue; // <br>로 직접 끊은 줄
    // 일본어는 글자 수(세 글자 이하), 한국어·영어·베트남어는 단어 수(한 단어)
    const bja = langOf(b) === 'ja';
    // 번역 전 국문 대체 글(일본어 페이지에 남은 한글 문장)은 일본어 줄바꿈 규칙으로 글자마다 끊겨 판단할 수 없다.
    // 번역 단계(마지막)에서 사라지며, 남은 대체 글은 콘텐츠 점검(test:content)이 '모양 다름'으로 알린다
    if (bja && /[가-힣]/.test(text) && !/[぀-ヿ一-鿿]/.test(text)) continue;
    // 두 단어뿐인 글(제품·표준 이름)이 한 단어씩 두 줄이 되는 것은 고른 나눔이라 보지 않는다
    const orphan = bja ? lastLine.reduce((a, w) => a + w.text.length, 0) <= 3 : lastLine.length === 1 && words.length >= 3;
    if (orphan) {
      const prev = lines[lines.length - 2].map((w) => w.text).join(bja ? '' : ' ');
      out.orphan.push(`${name(b)}: …${prev.slice(-14)} / ${lastLine.map((w) => w.text).join(' ')}`);
    }
  }

  /* 5) 누르는 곳 */
  if (opts.touch) {
    for (const el of document.querySelectorAll('a[href],button,select,input:not([type=hidden]),textarea,summary,[role=button]')) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width >= 44 && r.height >= 44) continue;
      // 체크박스·라디오는 감싼 label이 누르는 곳
      if (el instanceof HTMLInputElement && /checkbox|radio/.test(el.type)) {
        const l = el.closest('label')?.getBoundingClientRect();
        if (l && l.height >= 44) continue;
      }
      // 문장 속 링크(WCAG 2.5.8 inline 예외)
      if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') {
        const blk = blockOf(el);
        const own = (el.textContent || '').trim().length;
        const all = (blk?.textContent || '').trim().length;
        if (blk && all > own + 1) continue;
      }
      out.tap.push(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
  }

  const uniq = (a: string[]) => [...new Set(a)];
  out.overflow = uniq(out.overflow);
  out.outside = uniq(out.outside);
  out.small = uniq(out.small);
  out.body = uniq(out.body);
  out.tap = uniq(out.tap);
  out.orphan = uniq(out.orphan);
  return out;
}
