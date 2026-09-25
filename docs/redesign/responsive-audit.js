// 반응형 점검 지표(브라우저 안에서 실행)
(() => {
  const vw = innerWidth, out = { vw, docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight };
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // 1) 가로 넘침
  out.overflow = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg,canvas,.stream-viewport,[aria-hidden="true"] .orbs')) continue;
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > vw + 1 || r.left < -1) && vis(el)) {
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') { const pr = p.getBoundingClientRect(); if (pr.right <= vw + 1 && pr.left >= -1) { clipped = true; break; } } p = p.parentElement; }
      if (!clipped) out.overflow.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) + ` L${Math.round(r.left)} R${Math.round(r.right)}`);
    }
  }
  out.overflow = [...new Set(out.overflow)].slice(0, 15);
  // 2) 작은 글자(보이는 텍스트 노드 기준)
  const small = new Map();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) {
    if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || el.closest('script,style,noscript,.drawer,[hidden]')) continue;
    if (!vis(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) { const k = (el.className ? el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] : el.tagName.toLowerCase()) + ' ' + fs.toFixed(1) + 'px'; small.set(k, (small.get(k) || 0) + 1); }
  }
  out.smallText = [...small.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, c]) => k + ' ×' + c);
  // 3) 탭 영역(44px 미만)
  out.tapSmall = [];
  for (const el of document.querySelectorAll('a,button,select,input,textarea,summary,[role=button]')) {
    if (!vis(el) || el.closest('.drawer')) continue; const r = el.getBoundingClientRect();
    if (r.height < 40 || r.width < 40) out.tapSmall.push((el.textContent || el.getAttribute('aria-label') || el.name || '').replace(/\s+/g, ' ').trim().slice(0, 22) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  out.tapSmallCount = out.tapSmall.length; out.tapSmall = out.tapSmall.slice(0, 25);
  // 4) 제품 화면 이미지 렌더 폭(읽힘 판단)
  out.shots = [];
  for (const img of document.querySelectorAll('main img')) {
    if (!vis(img)) continue; const r = img.getBoundingClientRect(); const nat = img.naturalWidth || +img.getAttribute('width') || 0;
    if (nat >= 900) out.shots.push(img.getAttribute('src').split('/').pop().split('?')[0] + ` ${Math.round(r.width)}px (원본 ${nat})`);
  }
  // 5) 섹션 높이(화면 몇 개 분량인지)
  out.sections = [...document.querySelectorAll('main > section, footer')].map(s => (s.id || s.getAttribute('aria-labelledby') || s.tagName.toLowerCase()) + ' ' + (s.getBoundingClientRect().height / innerHeight).toFixed(1) + 'vh');
  // 6) 제목 고아 단어(마지막 줄 2자 이하)
  out.orphans = [];
  for (const el of document.querySelectorAll('h1,h2,h3,.sec-lead,.hero-lead,p.ln-desc,.feat-copy>p,.lhub-points span')) {
    if (!vis(el) || el.closest('.drawer')) continue;
    const lines = new Map(); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) { const s = t.textContent; for (let i = 0; i < s.length; i++) { if (s[i] === ' ' || s[i] === '\n') continue; const rg = document.createRange(); rg.setStart(t, i); rg.setEnd(t, i + 1); const rc = rg.getClientRects()[0]; if (!rc) continue; const k = Math.round(rc.top / 6); lines.set(k, (lines.get(k) || '') + s[i]); } }
    const arr = [...lines.values()]; if (arr.length > 1 && arr[arr.length - 1].length <= 3) out.orphans.push(el.tagName.toLowerCase() + ': …' + arr[arr.length - 2].slice(-6) + ' / ' + arr[arr.length - 1]);
  }
  // 7) 활성 핀
  out.pins = (window.ScrollTrigger ? ScrollTrigger.getAll().filter(s => s.pin).map(s => (s.trigger.id || s.trigger.className.split(' ')[0])) : 'no ST');
  return out;
})()
