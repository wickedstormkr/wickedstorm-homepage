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

/**
 * 그림 층 고르기: 주 그림은 캔버스(별 스프라이트·기록 행·체계). 성능이 되는 기기는 그 뒤에 WebGL 먼 별 층을 더한다.
 * WebGL을 못 쓰면 캔버스만으로, 캔버스도 못 쓰면 미리 그린 그림(SVG)이 그대로 남는다.
 */
async function pickArt(canvas: HTMLCanvasElement): Promise<Art | null> {
  let main: CanvasArt;
  try {
    main = new CanvasArt(canvas);
  } catch {
    return null;
  }
  if (!strong()) return main;
  try {
    const { DeepField } = await import('./webgl-art');
    const back = document.createElement('canvas');
    back.className = 'story-art story-deep';
    back.setAttribute('aria-hidden', 'true');
    canvas.before(back);
    const deep = new DeepField(back);
    if (!deep.ok) { deep.destroy(); back.remove(); return main; }
    return {
      resize: (w, h, box, a) => { deep.resize(w, h); main.resize(w, h, box, a); },
      setScene: (s) => { deep.setScene(s); main.setScene(s); },
      setAmbient: (on) => { deep.setAmbient(on); main.setAmbient(on); },
      emit: (x, y, v) => main.emit(x, y, v),
      destroy: () => { deep.destroy(); back.remove(); main.destroy(); },
    };
  } catch {
    return main;
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
    gsap.set(scenes, { opacity: 0 });
    gsap.set(scenes[0], { opacity: 1 });
    for (let i = 1; i <= last; i++) {
      // 장면 1→2는 기록 행이 첫 화면 위에 그려지기 전에 글을 먼저 걷는다
      const out = i === 1 ? 0.15 : i - 0.35;
      const inn = i === 1 ? 0.55 : i - 0.3;
      tl.to(scenes[i - 1], { opacity: 0, y: -24, duration: 0.25 }, out)
        .fromTo(scenes[i], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3 }, inn);
    }
    // 장면 2: 응답이 문장으로 펼쳐진다(항목 하나씩)
    // 장면 3: 입자가 자리를 잡을 때 이름표
    tl.from(q('.scene-store .art-labels li'), { opacity: 0, stagger: 0.02, duration: 0.15 }, 1.75);
    // 장면 4: 막대가 모인 뒤 실제 이상 탐지 화면으로 착지
    tl.from(q('.scene-signal .art-panel'), { opacity: 0, x: 40, duration: 0.25 }, 2.8);
    // 장면 5: 신호 도착 → 교수자 화면
    tl.from(q('.scene-judge .signal-alert'), { opacity: 0, y: -16, duration: 0.2 }, 3.7)
      .from(q('.scene-judge .fx-judge'), { opacity: 0, y: 24, duration: 0.25 }, 3.8);
    // 장면 2: 기록 칸 이름표(actor · verb · object)는 칸이 자리를 잡을 때
    tl.from(q('.scene-statement .ledger-head span'), { opacity: 0, y: 8, stagger: 0.03, duration: 0.2 }, 0.55)
      .from(q('.scene-statement .ledger-extra'), { opacity: 0, y: 10, duration: 0.2 }, 0.8);
    // 장면 6: 고리 둘레의 이름표
    tl.from(q('.scene-next .ring-labels li'), { opacity: 0, scale: 0.9, stagger: 0.03, duration: 0.2 }, 4.7);
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
      // 장면 2 기록 칸(무대 px)
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const lg = story.querySelector<HTMLElement>('[data-ledger]');
      art.resize(W, H, box, { shift, ledger: lg ? boxIn(lg, stage) : undefined });
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
    // 실시간 수집 패널에 기록이 올라오면 그 점에서 성운으로 빛이 날아든다(story/live.ts가 알린다)
    const onRecord = (e: Event) => {
      const d = (e as CustomEvent<{ el: HTMLElement; verb: number }>).detail;
      if (!art?.emit || !d?.el) return;
      const r = boxIn(d.el, stage);
      art.emit(r.x + r.w / 2, r.y + r.h / 2, d.verb);
    };
    story.addEventListener('story:record', onRecord);

    return () => {
      story.removeEventListener('story:record', onRecord);
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
