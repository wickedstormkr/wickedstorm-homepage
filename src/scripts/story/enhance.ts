/**
 * 오프닝 연출 층(데스크톱·움직임 허용일 때만, 첫 화면이 뜬 뒤 불러온다).
 * - GSAP ScrollTrigger: 고정된 무대에서 스크롤 위치를 장면 값(0~5)으로 바꾸고, 장면 전환과 장면 안 움직임을 스크럽한다.
 * - Lenis: 데스크톱 부드러운 스크롤(CLAUDE.md '기술').
 * - 데이터 아트: 캔버스(주 그림) + 성능이 되는 기기는 WebGL 먼 별 층. 둘 다 안 되면 미리 그린 그림(SVG)이 그대로 남는다.
 * 한 전환(장면 값의 소수부 f) 안의 순서: 앞 장면 글·그림이 빠짐(f .30–.45) → 입자가 옮겨 감(.45–.90)
 *   → 다음 장면 그림(창·이름표)이 들어옴(.52) → 입자가 착지한 뒤 다음 장면 글(.72). 장면 1→2만 기록 행이 줄마다 차오르는 시간에 맞춰 더 일찍.
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

/** 무대 기준 요소 위치(변형 없이 레이아웃 값으로: 들어오는 중인 창이 아니라 자리 잡을 곳) */
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
 * 그림 층 고르기: 주 그림은 캔버스(별 스프라이트·기록 행·체계·분포). 성능이 되는 기기는 그 뒤에 WebGL 먼 별 층을 더한다.
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
  const copies = scenes.map((s) => s.querySelector<HTMLElement>('.scene-copy')!);
  const visuals = scenes.map((s) => s.querySelector<HTMLElement>('.scene-visual')!);

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

    /* 장면 타임라인: 길이 5(장면 값과 같다). 장면 글과 그림을 따로 움직인다(opacity·transform만) */
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    gsap.set(scenes, { opacity: 1 });
    gsap.set([...copies.slice(1), ...visuals.slice(1)], { opacity: 0 });
    // 1 → 2: 첫 화면 글·실시간 수집 창이 먼저 물러나고, 별이 기록 행에 앉는 동안 칸 이름(.42)과 글(.55)이 들어온다
    tl.to([copies[0], visuals[0]], { opacity: 0, y: -20, duration: 0.18 }, 0.12)
      .to(q('.scene-moment :is(.live-sky,.live-fly)'), { opacity: 0, duration: 0.2 }, 0.12)
      .fromTo(visuals[1], { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.42)
      .from(q('.scene-statement .ledger-cols > div'), { opacity: 0, y: 8, stagger: 0.04, duration: 0.15 }, 0.46)
      .from(q('.scene-statement .ledger-foot'), { opacity: 0, y: 8, duration: 0.15 }, 0.82)
      .fromTo(copies[1], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.2 }, 0.55);
    for (let i = 2; i <= last; i++) {
      const b = i - 1;
      tl.to([copies[i - 1], visuals[i - 1]], { opacity: 0, y: -20, duration: 0.15 }, b + 0.3)
        .fromTo(visuals[i], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.2 }, b + 0.52)
        .fromTo(copies[i], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.18 }, b + 0.72);
    }
    // 장면 3: 입자가 성취 항목에 자리를 잡을 때 이름표와 오늘 수집 수
    tl.from(q('.scene-store :is(.art-labels li,.art-tag,.art-count)'), { opacity: 0, stagger: 0.015, duration: 0.14 }, 1.74);
    // 장면 4: 분포가 그래프 칸에 착지한 뒤 AI가 찾은 구간 표시 → 찾은 것(원인 후보·근거)
    tl.from(q('.scene-signal .fx-flag'), { opacity: 0, y: -6, duration: 0.12 }, 2.8)
      .from(q('.scene-signal .fx-finding > *'), { opacity: 0, y: 8, stagger: 0.04, duration: 0.14 }, 2.82);
    // 장면 5: 신호 도착 → 교수자 화면
    tl.from(q('.scene-judge .signal-alert'), { opacity: 0, y: -12, duration: 0.15 }, 3.55)
      .from(q('.scene-judge .fx'), { opacity: 0, y: 20, duration: 0.2 }, 3.64);
    // 장면 6: 고리 둘레의 이름표(장면 값 5에서 끝난다)
    tl.from(q('.scene-next .ring-labels li'), { opacity: 0, scale: 0.92, stagger: 0.04, duration: 0.12 }, 4.72)
      .from(q('.scene-next .ring-caption'), { opacity: 0, duration: 0.12 }, 4.8);
    tl.set({}, {}, last);

    let art: Art | null = null;
    const artBox = story.querySelector<HTMLElement>('.scene-store [data-art-box]');
    const alert = story.querySelector<HTMLElement>('.scene-judge .signal-alert');
    const ledger = story.querySelector<HTMLElement>('.scene-statement [data-ledger]');
    const chart = story.querySelector<HTMLElement>('.scene-signal [data-chart-slot]');
    const resize = () => {
      if (!art || !artBox) return;
      const box = boxIn(artBox, stage);
      // 장면 5: 근거 줄기가 신호 알림 바로 왼쪽으로 흘러들도록
      let shift: [number, number] = [0, 0];
      if (alert) {
        const a = boxIn(alert, stage);
        shift = [(a.x - 34 - box.x) / box.w - D_CENTER[0], (a.y + a.h / 2 - box.y) / box.h - D_CENTER[1]];
      }
      art.resize(stage.clientWidth, stage.clientHeight, box, {
        shift,
        ledger: ledger ? boxIn(ledger, stage) : undefined,
        chart: chart ? boxIn(chart, stage) : undefined,
      });
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
    // 지금 장면(목차·누를 수 있는 장면): 다음 장면 글이 들어오는 때에 맞춘다(1→2는 .45, 그 뒤는 소수부 .72)
    const current = (s: number) => (s < 1 ? (s >= 0.45 ? 1 : 0) : Math.min(last, Math.floor(s + 0.28)));
    // 스크럽으로 따라가는 동안에도 그림·현재 장면을 맞춘다(ScrollTrigger onUpdate는 스크롤 때만 불린다)
    tl.eventCallback('onUpdate', () => {
      const s = tl.time();
      story.dataset.s = s.toFixed(2);
      art?.setScene(s);
      setActive(current(s));
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
    // 글꼴이 늦게 와서 글 높이가 바뀌면 착지 자리(기록 칸·그래프 칸)도 다시 잰다
    document.fonts?.ready.then(() => { if (alive) resize(); });

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
      // GSAP이 바꾼 값만 지운다(위치를 정한 인라인 스타일: 이름표 자리·기록 행 칸 너비·별 자리는 그대로)
      gsap.set([...scenes, ...q('.scene *')], { clearProps: 'opacity,transform' });
    };
  });
}
