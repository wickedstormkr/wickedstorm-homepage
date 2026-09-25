/**
 * 오프닝 연출 층(데스크톱·움직임 허용일 때만, 첫 화면이 뜬 뒤 불러온다).
 * - GSAP ScrollTrigger: 고정된 무대에서 스크롤 위치를 장면 값(0~5)으로 바꾸고, 장면 전환과 장면 안 움직임을 스크럽한다.
 * - Lenis: 데스크톱 부드러운 스크롤(CLAUDE.md '기술').
 * - 데이터 아트: 성능이 되는 기기는 WebGL(OGL), 아니면 캔버스. 둘 다 안 되면 미리 그린 그림(SVG)이 그대로 남는다.
 * 움직임 멈춤을 누르면 떠다님이 멈추고, 장면 전환은 스크롤로만(사용자가 움직일 때만) 일어난다.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { motionAllowed, onMotionChange } from '../motion';
import { CanvasArt } from './canvas-art';
import type { Art, ArtBox } from './art-types';
import type { StoryHooks } from './boot';
import { D_CENTER } from '../../lib/story-data';

const PIN_MQ = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';

interface Opts {
  setActive: (i: number) => void;
  hooks: StoryHooks;
}

/** 무대 기준 요소 위치(변형 없이 레이아웃 값으로) */
function boxIn(el: HTMLElement, stage: HTMLElement): ArtBox {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== stage) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

const strong = () => {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 2) >= 4 && (nav.deviceMemory ?? 8) >= 4 && matchMedia('(pointer: fine)').matches;
};

async function pickArt(canvas: HTMLCanvasElement): Promise<Art | null> {
  if (strong()) {
    try {
      const { WebGLArt } = await import('./webgl-art');
      const gl = new WebGLArt(canvas);
      if (gl.ok) return gl;
      gl.destroy();
    } catch { /* 캔버스로 */ }
  }
  try {
    // WebGL을 시도한 캔버스는 2D 문맥을 얻지 못하므로 새 캔버스로 바꾼다
    const fresh = canvas.cloneNode() as HTMLCanvasElement;
    canvas.replaceWith(fresh);
    return new CanvasArt(fresh);
  } catch {
    return null;
  }
}

export function enhanceStory(story: HTMLElement, { setActive, hooks }: Opts) {
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const stage = story.querySelector<HTMLElement>('.story-stage')!;
  const scenes = [...story.querySelectorAll<HTMLElement>('.scene[data-scene]')];
  const last = scenes.length - 1;
  const q = (sel: string) => story.querySelectorAll<HTMLElement>(sel);

  const mm = gsap.matchMedia();
  mm.add(PIN_MQ, () => {
    root.classList.add('story-gsap');

    /* 부드러운 스크롤 */
    const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    hooks.scrollTo = (y) => lenis.scrollTo(y, { duration: 1.1 });

    /* 장면 타임라인: 길이 5(장면 값과 같다) */
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    gsap.set(scenes, { autoAlpha: 0 });
    gsap.set(scenes[0], { autoAlpha: 1 });
    for (let i = 1; i <= last; i++) {
      tl.to(scenes[i - 1], { autoAlpha: 0, y: -24, duration: 0.3 }, i - 0.35)
        .fromTo(scenes[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.3 }, i - 0.3);
    }
    // 장면 2: 응답이 문장으로 펼쳐진다(항목 하나씩)
    tl.from(q('.scene-statement .fx-stmt dl>div'), { autoAlpha: 0, x: -14, stagger: 0.045, duration: 0.14 }, 0.68);
    // 장면 3: 입자가 자리를 잡을 때 이름표
    tl.from(q('.scene-store .art-labels li'), { autoAlpha: 0, stagger: 0.02, duration: 0.15 }, 1.75);
    // 장면 4: 막대가 모인 뒤 실제 이상 탐지 화면으로 착지
    tl.from(q('.scene-signal .art-panel'), { autoAlpha: 0, x: 40, duration: 0.25 }, 2.8);
    // 장면 5: 신호 도착 → 교수자 화면
    tl.from(q('.scene-judge .signal-alert'), { autoAlpha: 0, y: -16, duration: 0.2 }, 3.7)
      .from(q('.scene-judge .fx-judge'), { autoAlpha: 0, y: 24, duration: 0.25 }, 3.8);
    // 장면 1→2: 이름표가 사라지고 문장이 펼쳐진다
    tl.to(q('.scene-moment .moment-tag'), { autoAlpha: 0, duration: 0.2 }, 0.3);
    // 장면 6: 고리 둘레의 이름표
    tl.from(q('.scene-next .ring-labels li'), { autoAlpha: 0, scale: 0.9, stagger: 0.03, duration: 0.2 }, 4.7);
    tl.set({}, {}, last);

    let art: Art | null = null;
    const artBox = story.querySelector<HTMLElement>('.scene-store [data-art-box]');
    const alert = story.querySelector<HTMLElement>('.scene-judge .signal-alert');
    const resize = () => {
      if (!art || !artBox) return;
      const box = boxIn(artBox, stage);
      // 장면 5: 근거 묶음이 신호 알림 바로 왼쪽에 모이도록
      let shift: [number, number] = [0, 0];
      if (alert) {
        const a = boxIn(alert, stage);
        shift = [(a.x - 34 - box.x) / box.w - D_CENTER[0], (a.y + a.h / 2 - box.y) / box.h - D_CENTER[1]];
      }
      // 주인공 입자가 설 자리: 장면 1 이름표의 점, 장면 2 문장 카드의 왼쪽 끝(무대 기준 0~1)
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const at = (sel: string): [number, number] | undefined => {
        const el = story.querySelector<HTMLElement>(sel);
        if (!el) return undefined;
        const r = boxIn(el, stage);
        return [(r.x + r.w / 2) / W, (r.y + r.h / 2) / H];
      };
      art.resize(W, H, box, { shift, heroG: at('[data-anchor="moment"]'), heroF: at('[data-anchor="stmt"]') });
      art.setScene(tl.time());
    };

    const st = ScrollTrigger.create({
      trigger: story,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      animation: tl,
      onRefresh: resize,
    });
    // 스크럽으로 따라가는 동안에도 그림·현재 장면을 맞춘다(ScrollTrigger onUpdate는 스크롤 때만 불린다)
    tl.eventCallback('onUpdate', () => {
      const s = tl.time();
      story.dataset.s = s.toFixed(2);
      art?.setScene(s);
      // 장면 글이 바뀌는 때(i - 0.2 무렵)에 맞춘다
      setActive(Math.min(last, Math.max(0, Math.floor(s + 0.2))));
    });

    /* 떠다님: 움직임 허용 + 이야기가 화면에 있음 + 탭이 보임 */
    let inView = true;
    const ambient = () => {
      const on = motionAllowed() && inView && !document.hidden;
      art?.setAmbient(on);
      story.dataset.ambient = art && on ? 'on' : 'off';
    };
    const io = new IntersectionObserver(([en]) => { inView = en.isIntersecting; ambient(); });
    io.observe(story);
    const offMotion = onMotionChange(ambient);
    document.addEventListener('visibilitychange', ambient);

    let alive = true;
    const canvas = story.querySelector<HTMLCanvasElement>('canvas.story-art');
    if (canvas && artBox) {
      pickArt(canvas).then((a) => {
        if (!alive) { a?.destroy(); return; }
        art = a;
        if (!art) return;
        root.classList.add('art-live');
        resize();
        ambient();
      });
    }
    addEventListener('resize', resize);

    return () => {
      alive = false;
      st.kill();
      tl.eventCallback('onUpdate', null);
      tl.kill();
      gsap.ticker.remove(raf);
      lenis.destroy();
      delete hooks.scrollTo;
      io.disconnect();
      offMotion();
      document.removeEventListener('visibilitychange', ambient);
      removeEventListener('resize', resize);
      art?.destroy();
      art = null;
      root.classList.remove('story-gsap', 'art-live');
      gsap.set([...scenes, ...q('.scene *')], { clearProps: 'all' });
    };
  });
}
