/**
 * 모든 페이지 공통 스크립트(첫 로드 JS 예산 90KB gzip 안에서 아주 작게 유지).
 * 헤더 숨김/배경, 모바일 메뉴, 움직임 멈춤, 언어 안내 띠, 채널 링크, 연혁 펼치기, 파이프라인 루프 정지.
 * 상시 rAF 루프 없음. 연출(GSAP·Lenis·WebGL)은 2단계에서 따로 불러온다.
 */
import { initMotion } from './motion';
import { initStory, storyHooks } from './story/boot';
import { SOCIAL } from '../config/client';

const doc = document;
const root = doc.documentElement;
/** 글꼴이 들어온 뒤 다시(글자 폭이 바뀐다). 언어별 글꼴 조각은 나중에 들어올 수 있어 ready 뒤에도 받을 때마다 */
const onFonts = (fn: () => void) => {
  doc.fonts?.ready.then(fn);
  doc.fonts?.addEventListener?.('loadingdone', fn);
};

/* ---------- 헤더: 20px 넘으면 불투명 배경, 아래로 스크롤하면 숨기고 위로 올리면 보인다 ---------- */
(() => {
  const hdr = doc.getElementById('hdr');
  if (!hdr) return;
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    hdr.classList.toggle('scrolled', y > 20);
    const menuOpen = root.classList.contains('nav-open');
    const focusInside = hdr.contains(doc.activeElement);
    hdr.classList.toggle('hide', !menuOpen && !focusInside && y > 240 && y > lastY + 4);
    if (y < lastY - 4 || y <= 240) hdr.classList.remove('hide');
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  hdr.addEventListener('focusin', () => hdr.classList.remove('hide'));
  update();
})();

/* ---------- 모바일 메뉴: aria-expanded, ESC로 닫기, 링크 누르면 닫기, 열린 동안 본문 스크롤 잠금 ---------- */
(() => {
  const btn = doc.getElementById('menuBtn');
  const drawer = doc.getElementById('drawer');
  if (!btn || !drawer) return;
  let open = false;
  let hideTimer = 0;
  const set = (next: boolean) => {
    open = next;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', (open ? btn.dataset.close : btn.dataset.open) ?? '');
    window.clearTimeout(hideTimer);
    if (open) {
      drawer.hidden = false;
      requestAnimationFrame(() => drawer.classList.add('open'));
      root.classList.add('nav-open');
    } else {
      drawer.classList.remove('open');
      root.classList.remove('nav-open');
      hideTimer = window.setTimeout(() => { if (!open) drawer.hidden = true; }, 400);
    }
  };
  btn.addEventListener('click', () => set(!open));
  drawer.addEventListener('click', (e) => { if ((e.target as Element).closest('a')) set(false); });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { set(false); btn.focus(); }
  });
  // 넓은 화면으로 바뀌면 닫는다
  matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && open) set(false); });
})();

/* ---------- 언어 선택(details): 바깥을 누르거나 ESC면 닫는다 ---------- */
(() => {
  const menus = [...doc.querySelectorAll<HTMLDetailsElement>('details.lang-menu')];
  doc.addEventListener('click', (e) => {
    menus.forEach((m) => { if (m.open && !m.contains(e.target as Node)) m.open = false; });
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    menus.forEach((m) => { if (m.open) { m.open = false; m.querySelector('summary')?.focus(); } });
  });
})();

/* ---------- 맨 위로: 한 화면 넘게 내려가면 보인다. 데스크톱 고정 이야기가 화면을 채우는 동안은 숨긴다(장면 목차·조작이 있다) ---------- */
(() => {
  const btn = doc.getElementById('toTop');
  if (!btn) return;
  const story = doc.querySelector<HTMLElement>('[data-story]');
  let ticking = false;
  const update = () => {
    ticking = false;
    let show = window.scrollY > window.innerHeight * 0.9;
    let deep = false;
    if (story && root.classList.contains('story-pin')) {
      const r = story.getBoundingClientRect();
      const inStory = r.top <= 1 && r.bottom >= window.innerHeight - 1;
      if (inStory) show = false;
      // 첫 장면을 지나 장면을 넘기는 동안: 언어 안내 띠를 숨긴다(story.css)
      deep = inStory && r.top < -window.innerHeight * 0.3;
    }
    btn.classList.toggle('show', show);
    root.classList.toggle('story-deep', deep);
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
  btn.addEventListener('click', () => {
    // 여러 장면을 거꾸로 돌리지 않게 바로 올라간다(연출 층이 있으면 그 스크롤로)
    if (storyHooks.scrollTo) storyHooks.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0, behavior: 'auto' });
    doc.querySelector<HTMLElement>('.brand')?.focus({ preventScroll: true });
  });
})();

/* ---------- 움직임 멈춤(오프닝 이야기 조작 안의 버튼) ---------- */
initMotion([...doc.querySelectorAll<HTMLElement>('[data-motion-btn]')]);

/* ---------- 언어 안내 띠 ---------- */
(() => {
  const box = doc.getElementById('langBanner');
  if (!box) return;
  const KEY = 'ws-lang-banner';
  try { if (localStorage.getItem(KEY)) return; } catch { /* 저장소 없음: 매번 판단 */ }
  const page = root.lang;
  const prefs = (navigator.languages?.length ? navigator.languages : [navigator.language]).map((l) => l.slice(0, 2).toLowerCase());
  const first = prefs[0];
  // 브라우저 첫 번째 언어가 이 페이지 언어면 띄우지 않는다
  if (!first || first === page) return;
  const tpl = box.querySelector<HTMLTemplateElement>(`template[data-lang="${first}"]`);
  if (!tpl) return;
  box.append(tpl.content.cloneNode(true));
  box.setAttribute('aria-label', box.querySelector('p')?.textContent ?? '');
  box.setAttribute('lang', first);
  box.hidden = false;
  // 맨 위로 버튼이 띠 위로 비켜 서게(chrome.css html.lb-open)
  root.style.setProperty('--lb-h', `${box.offsetHeight}px`);
  root.classList.add('lb-open');
  box.querySelector('[data-close]')?.addEventListener('click', () => {
    root.classList.remove('lb-open');
    box.hidden = true;
    try { localStorage.setItem(KEY, '1'); } catch { /* 무시 */ }
  });
})();

/* ---------- 채널 링크(인스타그램·블로그): src/config/client.ts에 주소가 있는 채널만 보인다 ---------- */
(() => {
  let any = false;
  doc.querySelectorAll<HTMLAnchorElement>('[data-social]').forEach((a) => {
    const c = SOCIAL[a.dataset.social as keyof typeof SOCIAL];
    if (!c?.url || !/^https:\/\//.test(c.url)) return;
    a.href = c.url;
    a.hidden = false;
    any = true;
    const h = a.querySelector('[data-social-handle]');
    if (h && c.label) h.textContent = c.label;
  });
  if (any) doc.querySelectorAll<HTMLElement>('[data-social-group]').forEach((g) => { g.hidden = false; });
})();

/* ---------- 연혁 펼치기(폰 전용 버튼) ---------- */
(() => {
  const box = doc.getElementById('history');
  const btn = box?.querySelector<HTMLButtonElement>('.hist-more');
  if (!box || !btn) return;
  btn.addEventListener('click', () => {
    const open = box.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = (open ? btn.dataset.less : btn.dataset.more) ?? '';
    if (!open) box.scrollIntoView({ block: 'start' });
  });
})();

/* ---------- 오프닝 여섯 장면: 폰·태블릿 장면 재생, 데스크톱 연출 층 불러오기 ---------- */
initStory();

/* ---------- 표준 지도: 폭이 줄어 한 칸이라도 상태가 이름 아래로 내려가면 모든 칸을 같은 두 줄 짜임으로(.std-stack, pages.css) ----------
   언어마다 상태 글 길이가 달라 CSS 폭 기준으로는 정할 수 없어, 한 줄 짜임에서 실제로 내려갔는지 잰다. 폭이 바뀔 때만 다시 잰다 */
doc.querySelectorAll<HTMLElement>('.std-map').forEach((map) => {
  const chips = [...map.querySelectorAll<HTMLElement>('.std-chip')];
  const fit = () => {
    map.classList.remove('std-stack');
    const wrapped = chips.some((c) => {
      const name = c.querySelector('b');
      const state = c.querySelector('span');
      return !!name && !!state && state.getBoundingClientRect().top >= name.getBoundingClientRect().bottom - 1;
    });
    map.classList.toggle('std-stack', wrapped);
  };
  let lastW = -1;
  new ResizeObserver(([en]) => {
    const w = Math.round(en.contentRect.width);
    if (w === lastW) return;
    lastW = w;
    fit();
  }).observe(map);
  onFonts(fit);
});

/* ---------- CASE 그림 이름표(데스크톱): 가지 이름표가 이웃과 겹치면(10px 미만) 넓은 쪽부터 좁혀 여러 줄로(.art-tight, story.css) ----------
   한국어는 한 줄씩 들어가 그대로이고 긴 번역만 좁힌다. 낱말·구보다 좁힐 수 없으면 이웃을 좁힌다. 폭·글꼴이 바뀔 때 다시 잰다 */
doc.querySelectorAll<HTMLElement>('.art-box').forEach((box) => {
  const labels = [...box.querySelectorAll<HTMLElement>('.art-labels li.branch')];
  if (!labels.length) return;
  const range = doc.createRange();
  /** 글자가 실제로 차지하는 사각형(칸보다 넘친 글자까지) */
  const ext = (el: HTMLElement) => { range.selectNodeContents(el); return range.getBoundingClientRect(); };
  const clashes = () => {
    const shown = labels.filter((l) => l.getClientRects().length);
    const R = shown.map(ext);
    const out: [HTMLElement, HTMLElement, number][] = [];
    R.forEach((a, i) => R.forEach((c, j) => {
      if (j <= i) return;
      const gx = Math.max(a.left - c.right, c.left - a.right);
      if (gx < 10 && Math.max(a.top - c.bottom, c.top - a.bottom) < 2) out.push([shown[i], shown[j], 10 - gx]);
    }));
    return out;
  };
  /** 글 폭을 by만큼(가운데 정렬이라 이웃과의 간격은 by/2 는다), 가장 긴 낱말·구 폭까지만 줄인다. 더 줄일 수 없으면 false */
  const shrink = (el: HTMLElement, by: number) => {
    const before = el.style.maxWidth;
    const w = ext(el).width;
    el.style.maxWidth = '0px';
    const min = ext(el).width;
    const target = Math.ceil(Math.max(w - by, min));
    if (target >= w - 1) { el.style.maxWidth = before; return false; }
    el.style.maxWidth = `${target}px`;
    return true;
  };
  const fit = () => {
    box.classList.remove('art-tight');
    labels.forEach((l) => { l.style.maxWidth = ''; });
    if (!clashes().length) return;
    box.classList.add('art-tight');
    for (let k = 0; k < 16; k++) {
      const cs = clashes();
      if (!cs.length) break;
      let moved = false;
      for (const [a, b, over] of cs) {
        const [x, y] = ext(a).width >= ext(b).width ? [a, b] : [b, a];
        if (shrink(x, over * 2) || shrink(y, over * 2)) moved = true;
      }
      if (!moved) break;
    }
  };
  let lastW = -1;
  new ResizeObserver(([en]) => {
    const w = Math.round(en.contentRect.width);
    if (w === lastW) return;
    lastW = w;
    fit();
  }).observe(box);
  onFonts(fit);
});

/* 탭(역할별 제품 화면): JS가 없으면 모두 보이고, 있으면 탭으로. 방향키·Home·End로 이동(WAI-ARIA 탭 패턴) */
document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((box) => {
  const list = box.querySelector<HTMLElement>('[role=tablist]');
  const tabs = [...box.querySelectorAll<HTMLButtonElement>('[role=tab]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls') ?? ''));
  if (!list || !tabs.length) return;
  list.hidden = false;
  box.classList.add('is-tabs');
  const select = (i: number, focus = false) => {
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
      if (panels[k]) panels[k]!.hidden = k !== i;
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (to < 0) return;
      e.preventDefault();
      select(to, true);
    });
  });
  select(0);
});
