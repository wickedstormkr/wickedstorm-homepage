/**
 * 오프닝 여섯 장면의 첫 로드 스크립트(작게 유지).
 * - 세로 장면(폰·태블릿·움직임 줄이기): 장면이 화면에 들어오면 .play(그 장면의 짧은 움직임만 한 번)
 * - 데스크톱 고정(html.story-pin, head 인라인 스크립트가 첫 그리기 전에 붙임): GSAP 없이도 스크롤 위치로 장면을 바꾼다.
 *   첫 화면이 뜬 뒤 연출 층(enhance.ts: GSAP·Lenis·데이터 아트)을 불러와 이어받는다. 불러오지 못해도 이야기는 끝까지 넘어간다.
 * - 키보드: 장면 이동 목록(링크), 보이지 않는 장면 안으로 초점이 가면 그 장면으로 스크롤
 */
import { initLive } from './live';

const PIN_MQ = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';

export interface StoryHooks {
  /** 연출 층이 있으면 그쪽 스크롤(Lenis)을 쓴다 */
  scrollTo?: (y: number) => void;
}
export const storyHooks: StoryHooks = {};

export function initStory() {
  const story = document.querySelector<HTMLElement>('[data-story]');
  if (!story) return;
  const root = document.documentElement;
  const scenes = [...story.querySelectorAll<HTMLElement>('.scene[data-scene]')];
  const links = [...story.querySelectorAll<HTMLAnchorElement>('.story-nav a[data-go]')];
  const last = scenes.length - 1;
  const mq = matchMedia(PIN_MQ);
  initLive(story);

  /* 세로 장면: 화면에 들어오면 재생 */
  const io = new IntersectionObserver(
    (ents) => ents.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('play'); io.unobserve(en.target); }
    }),
    { threshold: 0.2 },
  );
  scenes.forEach((s) => io.observe(s));

  /* 고정 모드: 스크롤 위치 → 장면 */
  const pinned = () => root.classList.contains('story-pin');
  const range = () => Math.max(1, story.offsetHeight - innerHeight);
  const sceneY = (i: number) => story.getBoundingClientRect().top + scrollY + (range() * i) / last;
  let active = 0;
  const setActive = (i: number) => {
    if (i === active) return;
    scenes[active]?.classList.remove('is-active');
    scenes[i]?.classList.add('is-active');
    links.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
    active = i;
  };
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    // 연출 층(enhance)이 있으면 그쪽이 장면 값으로 현재 장면을 정한다(두 곳이 번갈아 바꾸지 않게)
    if (!pinned() || root.classList.contains('story-gsap')) return;
    const p = Math.min(1, Math.max(0, -story.getBoundingClientRect().top / range()));
    setActive(Math.round(p * last));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  const go = (i: number) => {
    const y = sceneY(i);
    if (storyHooks.scrollTo) storyHooks.scrollTo(y);
    else scrollTo({ top: y, behavior: 'auto' });
  };
  links.forEach((a, i) => a.addEventListener('click', (e) => {
    if (!pinned()) return; // 세로 장면이면 보통 앵커 이동
    e.preventDefault();
    go(i);
    history.replaceState(null, '', a.hash);
  }));
  // 보이지 않는 장면 안의 링크·버튼으로 초점이 가면 그 장면으로
  story.addEventListener('focusin', (e) => {
    if (!pinned()) return;
    const sc = (e.target as Element).closest<HTMLElement>('.scene[data-scene]');
    if (sc && !sc.classList.contains('is-active')) go(Number(sc.dataset.scene));
  });

  /* #scene-signal 같은 주소로 들어오면 그 장면으로(고정 모드에서는 장면이 무대 안에 겹쳐 있어 브라우저가 찾아가지 못한다) */
  const deep = scenes.findIndex((s) => `#${s.id}` === location.hash);
  if (deep > 0) {
    const jump = () => requestAnimationFrame(() => { if (pinned()) go(deep); });
    if (document.readyState === 'complete') jump();
    else addEventListener('load', jump, { once: true });
  }

  /* 화면 폭·움직임 설정이 바뀌면 고정 여부를 다시 정한다 */
  mq.addEventListener('change', () => {
    root.classList.toggle('story-pin', mq.matches);
    onScroll();
    if (mq.matches) loadEnhance();
  });

  /* 연출 층: 첫 화면이 뜬 뒤, 데스크톱에서만 */
  let loaded = false;
  const loadEnhance = () => {
    if (loaded || !mq.matches) return;
    loaded = true;
    import('./enhance')
      .then((m) => m.enhanceStory(story, { setActive, hooks: storyHooks }))
      .catch(() => { /* 기본 장면 전환으로 계속 */ });
  };
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 300));
  if (document.readyState === 'complete') idle(loadEnhance);
  else addEventListener('load', () => idle(loadEnhance), { once: true });
}
