/**
 * 모든 페이지 공통 스크립트(첫 로드 JS 예산 90KB gzip 안에서 아주 작게 유지).
 * 헤더 숨김/배경, 모바일 메뉴, 움직임 멈춤, 언어 안내 띠, 채널 링크, 연혁 펼치기, 파이프라인 루프 정지.
 * 상시 rAF 루프 없음. 연출(GSAP·Lenis·WebGL)은 2단계에서 따로 불러온다.
 */
import { initMotion } from './motion';
import { initStory } from './story/boot';
import { SOCIAL } from '../config/client';

const doc = document;
const root = doc.documentElement;

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

/* ---------- 움직임 멈춤 ---------- */
initMotion(doc.getElementById('motionBtn'));

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
  box.querySelector('[data-close]')?.addEventListener('click', () => {
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
