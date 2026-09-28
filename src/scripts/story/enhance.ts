/** One renderer for every viewport. DOM anchors are measured only after layout
 * changes; the scroll frame moves those anchors with each scene's reading pan. */
import { motionAllowed, onMotionChange } from '../motion';
import { CanvasArt } from './canvas-art';
import type { Art, ArtBox } from './art-types';
import type { StoryFrame, StoryLayout } from './layout';

/** Ignore animated transforms when measuring the resting position. */
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
    const economize = () => deep.setAmbient(false);
    canvas.addEventListener('story:quality', economize);
    let dimensions = '';
    return {
      resize: (w, h, box, a) => {
        const next = `${w},${h}`;
        if (next !== dimensions) { deep.resize(w, h); dimensions = next; }
        main.resize(w, h, box, a);
      },
      setScene: (s) => { deep.setScene(s); main.setScene(s); },
      setAmbient: (on) => { deep.setAmbient(on && canvas.dataset.quality !== 'economy'); main.setAmbient(on); },
      land: (x, y, v) => main.land(x, y, v),
      destroy: () => { canvas.removeEventListener('story:quality', economize); deep.destroy(); back.remove(); main.destroy(); },
    };
  } catch {
    return main;
  }
}

export function enhanceStory(story: HTMLElement, layout: StoryLayout) {
  const root = document.documentElement;
  const { stage, scenes } = layout;
  const copies = scenes.map((s) => s.querySelector<HTMLElement>('.scene-copy')!);
  // 장면 1(첫 문구)에는 그림 칸이 없다
  const visuals = scenes.map((s) => s.querySelector<HTMLElement>('.scene-visual'));
  const fx = sceneFx(story, scenes, copies, visuals);
  root.classList.add('story-enhanced');
  let art: Art | null = null;
  let alive = true;
  let inView = true;
  const anchorElements = [
    story.querySelector<HTMLElement>('.scene-store [data-art-box]')!,
    story.querySelector<HTMLElement>('.scene-statement [data-ledger]')!,
    story.querySelector<HTMLElement>('.scene-signal [data-chart-slot]')!,
    story.querySelector<HTMLElement>('.scene-judge [data-notification-icon]')!,
    story.querySelector<HTMLElement>('.scene-next .ring-box')!,
  ];
  let anchors = anchorElements.map((el) => boxIn(el, stage));
  let previousPans = '';
  const positionArt = ({ pans }: StoryFrame, force = false) => {
    if (!art) return;
    const key = pans.join(',');
    if (!force && key === previousPans) return;
    previousPans = key;
    const moved = (index: number, scene: number) => ({ ...anchors[index], y: anchors[index].y - (pans[scene] ?? 0) });
    const box = moved(0, 2);
    art.resize(stage.clientWidth, stage.clientHeight, box, {
      ledger: moved(1, 1),
      chart: moved(2, 3),
      notification: moved(3, 4),
      ring: moved(4, 5),
    });
  };
  const measure = () => {
    anchors = anchorElements.map((el) => boxIn(el, stage));
    positionArt(layout.frame, true);
    art?.setScene(layout.frame.s);
  };
  story.addEventListener('story:layout', measure);
  const observer = new ResizeObserver(measure);
  anchorElements.forEach((el) => observer.observe(el));
  const unsubscribe = layout.subscribe((frame) => {
    fx.apply(frame.s);
    positionArt(frame);
    art?.setScene(frame.s);
  });
  const ambient = () => {
    const on = motionAllowed() && inView && !document.hidden;
    art?.setAmbient(on);
    story.dataset.ambient = art && on ? 'on' : 'off';
  };
  const io = new IntersectionObserver(([en]) => { inView = en.isIntersecting; ambient(); });
  io.observe(story);
  const offMotion = onMotionChange(ambient);
  document.addEventListener('visibilitychange', ambient);
  const canvas = story.querySelector<HTMLCanvasElement>('canvas.story-art');
  if (canvas) {
    pickArt(canvas).then((a) => {
      if (!alive) { a?.destroy(); return; }
      art = a;
      if (!art) return;
      root.classList.add('art-live');
      measure();
      ambient();
    });
  }
  const onLand = (e: Event) => {
    const d = (e as CustomEvent<{ x: number; y: number; verb: number }>).detail;
    if (d) art?.land?.(d.x + scenes[0].offsetLeft, d.y + scenes[0].offsetTop - (layout.frame.pans[0] ?? 0), d.verb);
  };
  story.addEventListener('story:land', onLand);
  return () => {
    alive = false;
    unsubscribe();
    observer.disconnect();
    io.disconnect();
    offMotion();
    document.removeEventListener('visibilitychange', ambient);
    story.removeEventListener('story:land', onLand);
    story.removeEventListener('story:layout', measure);
    art?.destroy();
    root.classList.remove('story-enhanced', 'art-live');
    story.dataset.ambient = 'off';
    fx.clear();
  };
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

function sceneFx(story: HTMLElement, scenes: HTMLElement[], copies: HTMLElement[], visuals: (HTMLElement | null)[]) {
  const last = scenes.length - 1;
  const parts: Part[] = [];
  const all = (sel: string) => [...story.querySelectorAll<HTMLElement>(sel)];
  scenes.forEach((_, i) => {
    const outAt = i === last ? undefined : i === 0 ? 0.12 : i + 0.3;
    const outDur = i === 0 ? 0.18 : 0.15;
    const vIn = i === 0 ? undefined : i === 1 ? 0.42 : i - 1 + 0.52;
    const cIn = i === 0 ? undefined : i === 1 ? 0.55 : i - 1 + 0.72;
    const visual = visuals[i];
    if (visual) parts.push({ el: visual, inAt: vIn, inDur: 0.2, outAt, outDur, dyIn: i === 1 ? 0 : 16, dyOut: -20 });
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
  reveal('.scene-judge .signal-notice', 3.55, 0, 0.15, -12);
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
