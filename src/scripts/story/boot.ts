/** Shared story navigation and native scrolling. Layout and reading distance are
 * independent of the optional renderer, so every scene works if it fails to load. */
import { initLive } from './live';
import { StoryLayout } from './layout';

export function initStory() {
  const story = document.querySelector<HTMLElement>('[data-story]');
  if (!story) return;
  const root = document.documentElement;
  const stage = story.querySelector<HTMLElement>('.story-stage')!;
  const scenes = [...story.querySelectorAll<HTMLElement>('.scene[data-scene]')];
  const links = [...story.querySelectorAll<HTMLAnchorElement>('.story-nav a[data-go]')];
  const last = scenes.length - 1;
  const mq = matchMedia('(prefers-reduced-motion: no-preference)');
  initLive(story);
  const layout = new StoryLayout(story, stage, scenes);
  let active = 0;
  const setActive = (i: number) => {
    scenes[active]?.classList.remove('is-active');
    scenes[i]?.classList.add('is-active');
    links.forEach((a, k) => k === i ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'));
    active = i;
  };
  layout.subscribe(({ s }) => {
    const i = s < 1 ? (s >= 0.45 ? 1 : 0) : Math.min(last, Math.floor(s + 0.28));
    if (i !== active) setActive(i);
  });

  const calm = () => root.classList.contains('motion-paused') || !mq.matches;
  const toY = (y: number, immediate = false) => scrollTo({ top: y, behavior: immediate || calm() ? 'instant' : 'smooth' });
  const go = (i: number, reading = 0, immediate = false) => {
    toY(layout.sceneY(i, reading), immediate);
    if (immediate || calm()) layout.syncScroll();
  };
  links.forEach((a, i) => a.addEventListener('click', (e) => {
    if (!layout.enabled) return;
    e.preventDefault();
    go(i);
    history.replaceState(null, '', a.hash);
  }));
  story.addEventListener('focusin', (e) => {
    if (!layout.enabled) return;
    const target = e.target as HTMLElement;
    const scene = target.closest<HTMLElement>('.scene[data-scene]');
    if (!scene) return;
    const i = Number(scene.dataset.scene);
    const targetRect = target.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    if (i === active && targetRect.top >= stageRect.top + 80 && targetRect.bottom <= stageRect.bottom - 120) return;
    const relativeY = targetRect.top - scene.getBoundingClientRect().top;
    go(i, Math.max(0, relativeY - 120), true);
  });

  const after = document.getElementById('after-story');
  const toAfter = (immediate: boolean) => {
    if (!after) return;
    toY(after.getBoundingClientRect().top + scrollY, immediate);
    after.focus({ preventScroll: true });
  };
  story.querySelector('[data-story-skip]')?.addEventListener('click', (e) => { e.preventDefault(); toAfter(true); });
  story.querySelector('[data-story-next]')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (layout.enabled) {
      if (active < last) go(active + 1);
      else toAfter(false);
    } else {
      const next = scenes.find((s) => s.getBoundingClientRect().top > 80);
      if (next) toY(next.getBoundingClientRect().top + scrollY);
      else toAfter(false);
    }
  });

  // A reduced-motion/no-JS reading view retains the same diagrams and all text.
  const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('play'); io.unobserve(entry.target); }
  }), { threshold: 0.2 });
  scenes.forEach((s) => io.observe(s));

  let cleanup: (() => void) | undefined;
  let loading = false;
  const loadEnhance = async () => {
    if (cleanup || loading || !mq.matches) return;
    loading = true;
    try {
      const { enhanceStory } = await import('./enhance');
      if (mq.matches) cleanup = enhanceStory(story, layout);
    } catch { /* Native scene navigation and SVGs remain available. */ }
    finally { loading = false; }
  };
  mq.addEventListener('change', () => {
    const index = active;
    const scene = scenes[index];
    const inStory = story.getBoundingClientRect().top <= 0 && story.getBoundingClientRect().bottom > innerHeight;
    cleanup?.();
    cleanup = undefined;
    root.classList.toggle('story-pin', mq.matches);
    if (mq.matches) {
      layout.refresh(false);
      if (inStory) go(index, 0, true);
      void loadEnhance();
    } else {
      scenes.forEach((s) => s.style.removeProperty('--scene-pan'));
      if (inStory) toY(scene.getBoundingClientRect().top + scrollY - 80, true);
    }
  });
  const ready = () => {
    layout.refresh();
    const deep = scenes.findIndex((s) => `#${s.id}` === location.hash);
    if (deep > 0 && layout.enabled) go(deep, 0, true);
    // Load the common renderer after the first paint, on phones as well as desktops.
    requestAnimationFrame(() => { void loadEnhance(); });
  };
  if (document.readyState === 'complete') ready();
  else addEventListener('load', ready, { once: true });
}
