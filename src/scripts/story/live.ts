/**
 * 장면 1 실시간 수집: 학습 활동이 xAPI 문장으로 한 줄씩 들어온다(시연 문장을 돌려 쓴다).
 * 다섯 줄이 차면 맨 위 줄이 올라가며 사라지고, 그 줄의 점(활동 종류 색)이 별이 되어 날아가 장면의 하늘에 자리 잡는다(쌓인다).
 * 그때마다 창 아래 '오늘 수집' 수가 하나 는다. 날아가는 움직임은 HTML 층(창 위), 자리 잡은 별은
 * 데스크톱 그림 층이 있으면 성운과 같은 스프라이트로(story:land → canvas-art land), 없으면(폰) 같은 모양의 CSS 별로 남는다.
 * 움직임 멈춤·탭 숨김·장면 1이 보이지 않을 때는 멈춘다(KWCAG 6.2.2).
 */
import { motionAllowed, onMotionChange } from '../motion';

interface Row { a: string; v: string; o: string; r: string; verb: number }
/** 활동 종류 색(story-data.ts VERB_COLOR와 같은 순서: 시청 · 응답 · 제출 · 질문) */
const COLOR = ['#2f7cff', '#7c4dff', '#e930b0', '#a3b1ff'];
const MAX_STARS = 60;

export function initLive(story: HTMLElement) {
  const box = story.querySelector<HTMLElement>('[data-live]');
  const list = box?.querySelector<HTMLOListElement>('[data-live-rows]');
  const scene = box?.closest<HTMLElement>('.scene');
  if (!box || !list || !scene) return;
  let pool: Row[] = [];
  try { pool = JSON.parse(box.dataset.live ?? '[]'); } catch { return; }
  if (!pool.length) return;
  const root = document.documentElement;
  let k = list.children.length % pool.length;
  let timer = 0;
  let inView = false;
  const GAP = 9;
  const counts = [...story.querySelectorAll<HTMLElement>('[data-live-count]')];
  const numLocale = root.lang === 'vi' ? 'vi-VN' : 'en-US';
  let count = Number((counts[0]?.textContent ?? '0').replace(/[^0-9]/g, '')) || 0;

  // 하늘(글 뒤, 자리 잡은 별)과 날아가는 층(창 위)
  const layer = (cls: string) => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); return d; };
  const sky = layer('live-sky');
  const fly = layer('live-fly');
  scene.prepend(sky);
  scene.append(fly);

  const land = (x: number, y: number, W: number, H: number, c: string, verb: number) => {
    if (root.classList.contains('story-pin') && root.classList.contains('art-live')) {
      story.dispatchEvent(new CustomEvent('story:land', { detail: { x, y, verb } }));
      return;
    }
    const s = document.createElement('i');
    s.className = 'spark';
    s.style.cssText = `--c:${c};--d:${(6 + Math.random() * 3).toFixed(1)}px;--tw:-${(Math.random() * 3.6).toFixed(2)}s;left:${((x / W) * 100).toFixed(2)}%;top:${((y / H) * 100).toFixed(2)}%`;
    sky.append(s);
    while (sky.children.length > MAX_STARS) sky.firstElementChild?.remove();
  };

  /** 사라지는 줄의 점 → 별: 창을 피한 곳으로 휘어 날아가 자리 잡는다(머리 하나 + 꼬리 둘) */
  const spark = (from: HTMLElement, verb: number) => {
    if (!motionAllowed() || !from.isConnected) return;
    const S = scene.getBoundingClientRect();
    const d = from.getBoundingClientRect();
    const P = box.getBoundingClientRect();
    const x0 = d.left + d.width / 2 - S.left;
    const y0 = d.top + d.height / 2 - S.top;
    const pinned = root.classList.contains('story-pin');
    let x1 = 0;
    let y1 = 0;
    for (let n = 0; n < 10; n++) {
      x1 = S.width * (pinned ? 0.03 + Math.random() * 0.6 : 0.03 + Math.random() * 0.94);
      y1 = S.height * (0.06 + Math.random() * 0.88);
      const inPanel = x1 > P.left - S.left - 20 && x1 < P.right - S.left + 20 && y1 > P.top - S.top - 20 && y1 < P.bottom - S.top + 20;
      if (!inPanel) break;
    }
    const c = COLOR[verb] ?? COLOR[0];
    const bend = (Math.random() < 0.5 ? -1 : 1) * (0.16 + Math.random() * 0.14);
    const cx = (x0 + x1) / 2 - (y1 - y0) * bend;
    const cy = (y0 + y1) / 2 + (x1 - x0) * bend;
    const frames = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12;
      const u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
      const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      return { transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(1 - t * 0.45).toFixed(3)})` };
    });
    [[9, 1, 0], [7, 0.45, 45], [5, 0.2, 90]].forEach(([size, op, delay], i) => {
      const el = document.createElement('i');
      el.className = 'spark';
      el.style.cssText = `--c:${c};--d:${size}px;opacity:${op}`;
      fly.append(el);
      const a = el.animate(frames, { duration: 1300, delay, easing: 'cubic-bezier(.35,.1,.25,1)', fill: 'both' });
      a.onfinish = () => {
        el.remove();
        if (i === 0) land(x1, y1, S.width, S.height, c, verb);
      };
    });
  };

  const make = (r: Row) => {
    const li = document.createElement('li');
    li.className = 'xrow in';
    li.dataset.verb = String(r.verb);
    const chip = (cls: string, txt: string) => { const s = document.createElement('span'); s.className = `chip ${cls}`; s.textContent = txt; return s; };
    const arw = (cls = '') => { const s = document.createElement('span'); s.className = `arw ${cls}`.trim(); s.setAttribute('aria-hidden', 'true'); s.textContent = '→'; return s; };
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.setAttribute('aria-hidden', 'true');
    li.append(dot, chip('actor', r.a), arw(), chip('verb', r.v), arw('brk'), chip('object', r.o), chip('result', r.r));
    return li;
  };

  /** 줄 자리: 위에서부터 줄 높이를 쌓은 자리로 translate만 바꾼다(줄은 position:absolute, story.css .live-rows.abs).
      줄이 들고 나도 다른 줄의 레이아웃 위치는 그대로라 레이아웃 이동(CLS)으로 세지 않는다. shift만큼 모두 위로 */
  const place = (shift = 0, animate = false) => {
    let y = -shift;
    for (const li of [...list.children] as HTMLElement[]) {
      li.style.transition = animate ? 'translate .55s cubic-bezier(.3,.7,.25,1), opacity .4s ease' : 'none';
      li.style.translate = `0 ${y}px`;
      y += li.offsetHeight + GAP;
    }
  };

  const push = () => {
    const r = pool[k++ % pool.length];
    list.append(make(r));
    place(); // 새 줄은 맨 아래 자리(보기 창 밖)에
    if (list.children.length > 5) {
      const first = list.children[0] as HTMLElement;
      const dot = first.querySelector<HTMLElement>('.dot');
      if (dot) spark(dot, Number(first.dataset.verb) || 0);
      count += 1;
      counts.forEach((el) => { el.textContent = count.toLocaleString(numLocale); });
      const h = first.offsetHeight + GAP;
      first.classList.add('leaving');
      requestAnimationFrame(() => place(h, true)); // 모두 한 칸 위로
      window.setTimeout(() => {
        first.remove();
        place();
      }, 600);
    }
  };

  const active = () => motionAllowed() && !document.hidden && inView && (!root.classList.contains('story-pin') || scene.classList.contains('is-active'));
  const tick = () => {
    timer = 0;
    if (!active()) return;
    push();
    timer = window.setTimeout(tick, 2400);
  };
  const sync = () => {
    if (active()) { if (!timer) timer = window.setTimeout(tick, 1200); }
    else if (timer) { clearTimeout(timer); timer = 0; }
  };
  const view = list.parentElement!;
  /** 시연 문장 전부가 한 줄 짜임에 글이 잘리지 않고 들어가는가(폭·언어마다 다르다: 베트남어 폰은 넘친다) */
  const oneLineFits = () => {
    const probe = document.createElement('ol');
    probe.className = 'live-rows';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;left:0;right:0;top:0;visibility:hidden;pointer-events:none';
    pool.forEach((r) => { const li = make(r); li.classList.remove('in'); probe.append(li); });
    view.append(probe);
    const ok = [...probe.children].every((li) => {
      const o = li.querySelector<HTMLElement>('.object');
      return li.scrollWidth <= li.clientWidth + 1 && (!o || o.scrollWidth <= o.clientWidth + 1);
    });
    probe.remove();
    return ok;
  };
  // 한 줄에 다 들어가지 않는 문장이 하나라도 있으면 모든 줄을 같은 두 줄 짜임으로(.live.two, story.css: 줄 높이가 고르게).
  // 그다음 보기 창 높이를 다섯 줄에 맞춰 둔다(줄이 오갈 때 창 높이가 흔들리지 않게)
  /** 폰의 영어 · 베트남어는 CSS가 처음부터 두 줄(story.css --two): 그때는 재지 않는다 */
  const cssTwo = () => getComputedStyle(box).getPropertyValue('--two').trim() === '1';
  const fix = () => {
    box.classList.remove('two');
    if (!cssTwo()) box.classList.toggle('two', !oneLineFits());
    const rows = [...list.children].slice(0, 5) as HTMLElement[];
    const h = rows.reduce((a, r) => a + r.offsetHeight, 0) + GAP * (rows.length - 1);
    if (h > 0) view.style.height = `${h}px`;
    if (list.classList.contains('abs')) place();
  };
  fix();
  list.classList.add('abs');
  place();
  addEventListener('resize', fix);
  document.fonts?.ready.then(fix);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(box);
  new MutationObserver(sync).observe(scene, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  onMotionChange(sync);
}
