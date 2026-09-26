/**
 * 오프닝 연출 층(데스크톱·움직임 허용일 때만, 첫 화면이 뜬 뒤 불러온다).
 * - GSAP ScrollTrigger: 고정된 무대에서 스크롤 위치를 장면 값(0~5)으로 바꾸고, 장면 전환과 장면 안 움직임을 스크럽한다.
 * - Lenis: 데스크톱 부드러운 스크롤(CLAUDE.md '기술').
 * - 데이터 아트: 캔버스(주 그림) + 성능이 되는 기기는 WebGL 먼 별 층. 둘 다 안 되면 미리 그린 그림(SVG)이 그대로 남는다.
 * 한 전환(장면 값의 소수부 f) 안의 순서: 앞 장면 글·그림이 빠짐(f .30–.45)과 함께 입자가 옮겨 감(.26–.86)
 *   → 다음 장면 그림(창·이름표)이 들어옴(.52) → 입자가 거의 착지한 뒤 다음 장면 글(.72). 장면 1→2만 기록 행이 줄마다 차오르는 시간에 맞춰 더 일찍.
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
      land: (x, y, v) => main.land(x, y, v),
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
  const copies = scenes.map((s) => s.querySelector<HTMLElement>('.scene-copy')!);
  const visuals = scenes.map((s) => s.querySelector<HTMLElement>('.scene-visual')!);

  const mm = gsap.matchMedia();
  mm.add(PIN_MQ, () => {
    root.classList.add('story-gsap');

    /* 부드러운 스크롤 */
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    hooks.scrollTo = (y, o) => lenis.scrollTo(y, o?.immediate ? { immediate: true } : { duration: 1.1 });

    /*
     * 장면 값 s(0~5)는 스크롤을 부드럽게 따라가는 빈 타임라인의 시각이다(ScrollTrigger scrub).
     * 장면 글·그림과 그 안의 등장 움직임은 트윈이 아니라 s에서 바로 계산해 그린다(scene-fx 아래).
     * 되감거나 빠르게 오르내려도 앞 장면 글이 남는 일이 없다: 같은 s에서는 언제나 같은 모습.
     */
    const tl = gsap.timeline({ paused: true });
    tl.set({}, {}, last);
    const fx = sceneFx(story, scenes, copies, visuals);
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
      scrub: 0.8,
      animation: tl,
      onRefresh: resize,
    });
    // 지금 장면(목차·누를 수 있는 장면): 다음 장면 글이 들어오는 때에 맞춘다(1→2는 .45, 그 뒤는 소수부 .72)
    const current = (s: number) => (s < 1 ? (s >= 0.45 ? 1 : 0) : Math.min(last, Math.floor(s + 0.28)));
    // 스크럽으로 따라가는 동안에도 그림·현재 장면을 맞춘다(ScrollTrigger onUpdate는 스크롤 때만 불린다)
    const render = () => {
      const s = tl.time();
      story.dataset.s = s.toFixed(2);
      fx.apply(s);
      art?.setScene(s);
      setActive(current(s));
    };
    tl.eventCallback('onUpdate', render);
    render();

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
    // 실시간 수집 창에서 날아간 별이 도착하면 성운의 별과 같은 모양으로 그린다(story/live.ts가 알린다, 장면 기준 px)
    const scene0 = scenes[0];
    const onLand = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number; verb: number }>).detail;
      if (!art?.land || !d) return;
      art.land(d.x + scene0.offsetLeft, d.y + scene0.offsetTop, d.verb);
    };
    story.addEventListener('story:land', onLand);
    // 글꼴이 늦게 와서 글 높이가 바뀌면 착지 자리(기록 칸·그래프 칸)도 다시 잰다
    document.fonts?.ready.then(() => { if (alive) resize(); });

    return () => {
      story.removeEventListener('story:land', onLand);
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
      // 연출 층이 바꾼 값만 지운다(위치를 정한 인라인 스타일: 이름표 자리·기록 행 칸 너비·별 자리는 그대로)
      fx.clear();
    };
  });
}

/*
 * 장면 글·그림 표시(장면 값 s의 함수). 한 전환(소수부 f) 안의 순서:
 * 앞 장면 글·그림이 빠짐(f .30–.45) → 입자가 옮겨 감 → 다음 장면 그림(.52) → 다음 장면 글(.72).
 * 장면 1→2만 기록 행이 줄마다 차오르는 시간에 맞춰 더 일찍(첫 화면 .12 빠짐, 그림 .42, 글 .55).
 * 옮김은 CSS translate 속성으로(이름표 자리를 정한 transform과 겹치지 않게).
 */
interface Part { el: HTMLElement; inAt?: number; inDur?: number; outAt?: number; outDur?: number; dyIn: number; dyOut: number }
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

function sceneFx(story: HTMLElement, scenes: HTMLElement[], copies: HTMLElement[], visuals: HTMLElement[]) {
  const last = scenes.length - 1;
  const parts: Part[] = [];
  const all = (sel: string) => [...story.querySelectorAll<HTMLElement>(sel)];
  scenes.forEach((_, i) => {
    const outAt = i === last ? undefined : i === 0 ? 0.12 : i + 0.3;
    const outDur = i === 0 ? 0.18 : 0.15;
    const vIn = i === 0 ? undefined : i === 1 ? 0.42 : i - 1 + 0.52;
    const cIn = i === 0 ? undefined : i === 1 ? 0.55 : i - 1 + 0.72;
    parts.push({ el: visuals[i], inAt: vIn, inDur: 0.2, outAt, outDur, dyIn: i === 1 ? 0 : 16, dyOut: -20 });
    parts.push({ el: copies[i], inAt: cIn, inDur: i === 1 ? 0.2 : 0.18, outAt, outDur, dyIn: 20, dyOut: -20 });
  });
  // 첫 장면의 하늘(자리 잡은 별)과 날아가는 별은 첫 화면 글과 함께 물러난다
  all('.scene-moment :is(.live-sky,.live-fly)').forEach((el) => parts.push({ el, outAt: 0.12, outDur: 0.2, dyIn: 0, dyOut: 0 }));
  // 장면 안의 등장 움직임(차례대로 한 번): 시작, 간격, 길이, 아래에서 올라오는 거리
  const reveal = (sel: string, at: number, stagger: number, dur: number, dy: number) =>
    all(sel).forEach((el, k) => parts.push({ el, inAt: at + k * stagger, inDur: dur, dyIn: dy, dyOut: 0 }));
  reveal('.scene-statement .ledger-cols > div', 0.46, 0.04, 0.15, 8);
  reveal('.scene-statement .ledger-foot', 0.82, 0, 0.15, 8);
  reveal('.scene-store :is(.art-labels li,.art-tag)', 1.74, 0.015, 0.14, 0);
  reveal('.scene-signal .fx-flag', 2.8, 0, 0.12, -6);
  reveal('.scene-signal .fx-finding > *', 2.82, 0.04, 0.14, 8);
  reveal('.scene-judge .signal-alert', 3.55, 0, 0.15, -12);
  reveal('.scene-judge .judge-stack > .fx', 3.64, 0, 0.2, 20);
  reveal('.scene-next .ring-labels li', 4.72, 0.04, 0.12, 6);
  reveal('.scene-next .ring-caption', 4.8, 0, 0.12, 0);
  scenes.forEach((sc) => { sc.style.opacity = '1'; });
  // 움직이는 조각은 저마다 합성 층으로: 투명도·옮김을 다시 그리지 않고 층째로 바꾼다.
  // 무대(고정된 큰 층)를 프레임마다 다시 그리면 Safari에서 지나간 글의 흔적이 남아 겹쳐 보이고, 느려진다.
  // opacity만 적는다(transform을 적으면 안쪽 절대 위치 요소의 기준이 바뀐다).
  for (const p of parts) p.el.style.willChange = 'opacity';
  return {
    apply(s: number) {
      // 먼 장면(지금 s에서 보일 일이 없는 장면)은 data-far: CSS가 그 장면의 글·그림을 잘라 아예 그리지 않는다(story.css).
      // 투명도 값이 어떤 이유로 남아도 겹쳐 보일 수 없게 하는 안전장치. 글은 화면 낭독기와 키보드로 그대로 닿는다.
      scenes.forEach((sc, i) => {
        const near = s > i - 0.62 && s < i + 0.55;
        if (sc.hasAttribute('data-far') === near) sc.toggleAttribute('data-far', !near);
      });
      for (const p of parts) {
        const pin = p.inAt === undefined ? 1 : easeOut(clamp01((s - p.inAt) / (p.inDur ?? 0.2)));
        const pout = p.outAt === undefined ? 0 : easeOut(clamp01((s - p.outAt) / (p.outDur ?? 0.15)));
        // 브라우저가 읽어 돌려주는 모양 그대로 만든다('0.5', '0px 12.3px'): 같은 값을 프레임마다 다시 쓰지 않게
        const o = String(+(pin * (1 - pout)).toFixed(3));
        const y = +((1 - pin) * p.dyIn + pout * p.dyOut).toFixed(1);
        const tr = y === 0 ? '' : `0px ${y}px`;
        // 지금 붙은 값과 비교한다(다른 곳에서 바뀌었어도 다시 맞춘다)
        if (p.el.style.opacity !== o) p.el.style.opacity = o;
        if (p.el.style.translate !== tr) p.el.style.translate = tr;
      }
    },
    clear() {
      for (const p of parts) { p.el.style.opacity = ''; p.el.style.translate = ''; p.el.style.willChange = ''; }
      scenes.forEach((sc) => { sc.style.opacity = ''; sc.removeAttribute('data-far'); });
    },
  };
}
