/**
 * 장면 2 국제 표준 수집: 학습 활동이 xAPI 문장으로 한 줄씩 아래에서 들어온다(시연 문장을 돌려 쓴다). 그때마다 '오늘 수집' 수가 하나 는다.
 * 표시 줄이 차면 맨 위 줄이 밀려나며, 그 줄의 네 칸(누가 · ~하다 · 무엇을 · 부가 정보)이 그대로 떠나 옆 기록 행의 같은 칸으로
 * 날아가 한 줄을 다시 쓴다: 날아가는 칸은 HTML 층(.live-fly, 창 위), 줄이 써지는 빛은 그림 층(story:write → canvas-art write).
 * 기록 행이 다 찬 뒤(장면 2에 머무를 때)만 돈다. 움직임 멈춤 · 탭 숨김 · 화면 밖이면 멈춘다(KWCAG 6.2.2).
 */
import { motionAllowed, onMotionChange } from '../motion';
import { LEDGER } from '../../lib/story-ledger';

interface Row { a: string; v: string; o: string; r: string }
/** 창의 칸 → 기록 행의 칸(같은 순서: 누가 · ~하다 · 무엇을 · 부가 정보) */
const CHIPS = ['actor', 'verb', 'object', 'result'] as const;
/** 장면 값이 이 사이일 때만 새 문장을 받는다: 스크롤로 기록 행이 다 찬 뒤, 장면 3으로 넘어가기 전 */
const SETTLED: [number, number] = [0.96, 1.25];

export function initLive(story: HTMLElement) {
  const box = story.querySelector<HTMLElement>('[data-live]');
  const list = box?.querySelector<HTMLOListElement>('[data-live-rows]');
  const scene = box?.closest<HTMLElement>('.scene');
  const ledger = scene?.querySelector<HTMLElement>('[data-ledger]');
  if (!box || !list || !scene) return;
  let pool: Row[] = [];
  try { pool = JSON.parse(box.dataset.live ?? '[]'); } catch { return; }
  if (!pool.length) return;
  const root = document.documentElement;
  let k = list.children.length % pool.length;
  let timer = 0;
  let removal = 0;
  let visibleRows = 4;
  let inView = false;
  let writeRow = 0;
  const GAP = 8;
  const counts = [...story.querySelectorAll<HTMLElement>('[data-live-count]')];
  const numLocale = root.lang === 'vi' ? 'vi-VN' : 'en-US';
  let count = Number((counts[0]?.textContent ?? '0').replace(/[^0-9]/g, '')) || 0;

  // 날아가는 빛의 층(장면 위): 장면과 함께 옮겨지고(--scene-pan) 장면 그림과 함께 물러난다(enhance.ts)
  const fly = document.createElement('div');
  fly.className = 'live-fly';
  fly.setAttribute('aria-hidden', 'true');
  scene.append(fly);

  /**
   * 밀려나는 맨 위 줄의 네 칸 → 기록 행 한 줄의 같은 칸: 칸(이름표)이 그대로 떠나 휘어 날아가며 작아지고, 기록 칸 가운데에 닿으며 스며든다.
   * 왼쪽 칸부터 차례로. 첫 칸이 닿으면 그림 층이 그 줄을 왼쪽부터 다시 쓴다(뒤 칸은 쓰는 머리와 함께 닿는다). 기록 행은 위에서부터 차례로 쓴다
   */
  const send = (li: HTMLElement) => {
    if (!motionAllowed() || !ledger || !li.isConnected) return;
    const S = scene.getBoundingClientRect();
    const L = ledger.getBoundingClientRect();
    if (!L.width || !L.height) return;
    const target = writeRow;
    const row = LEDGER.rows[target];
    writeRow = (writeRow + 1) % LEDGER.rows.length;
    // 창 옆에 기록 행이 있으면 먼저 옆으로, 아래에 있으면 먼저 아래로 나간다(창의 다른 줄 위를 지나지 않게)
    const beside = L.left >= box.getBoundingClientRect().right - 1;
    CHIPS.forEach((cls, slot) => {
      const chip = li.querySelector<HTMLElement>(`.chip.${cls}`);
      const pill = row.pills[slot];
      if (!chip || !pill) return;
      const c = chip.getBoundingClientRect();
      const x0 = c.left - S.left;
      const y0 = c.top - S.top;
      // 칸 가운데끼리 잇는 휜 길(칸의 왼쪽 위 기준으로 옮긴다)
      const dx = L.left + (pill.x + pill.w / 2) * L.width - (c.left + c.width / 2);
      const dy = L.top + row.y * L.height - (c.top + c.height / 2);
      const cx = beside ? dx * 0.6 : 0;
      const cy = beside ? 0 : dy * 0.6;
      const end = Math.max(0.35, Math.min(0.7, (L.height * LEDGER.pillH * 1.6) / c.height));
      const frames = Array.from({ length: 13 }, (_, i) => {
        const t = i / 12;
        const u = 1 - t;
        const x = 2 * u * t * cx + t * t * dx;
        const y = 2 * u * t * cy + t * t * dy;
        return {
          transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(1 - t * (1 - end)).toFixed(3)})`,
          opacity: t < 0.72 ? 1 : +(1 - (t - 0.72) / 0.28).toFixed(3),
        };
      });
      const delay = slot * 90;
      // 창의 칸은 그 자리에서 떠난다(같은 칸이 두 번 보이지 않게). 빈 줄은 밀려 올라가며 옅어진다(.leaving)
      chip.style.visibility = 'hidden';
      const ghost = document.createElement('span');
      ghost.className = `chip ${cls} ghost`;
      ghost.textContent = chip.textContent;
      ghost.style.cssText = `left:${x0.toFixed(1)}px;top:${y0.toFixed(1)}px;width:${c.width.toFixed(1)}px;height:${c.height.toFixed(1)}px`;
      fly.append(ghost);
      const a = ghost.animate(frames, { duration: 1000, delay, easing: 'cubic-bezier(.4,.1,.25,1)', fill: 'both' });
      a.onfinish = () => {
        ghost.remove();
        if (slot === 0) story.dispatchEvent(new CustomEvent('story:write', { detail: { row: target } }));
      };
    });
  };

  const make = (r: Row) => {
    const li = document.createElement('li');
    li.className = 'xrow in';
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
    const li = make(pool[k++ % pool.length]);
    list.append(li);
    place(); // 새 줄은 맨 아래 자리(보기 창 밖)에
    count += 1;
    counts.forEach((el) => { el.textContent = count.toLocaleString(numLocale); });
    if (list.children.length > visibleRows) {
      const first = list.children[0] as HTMLElement;
      const h = first.offsetHeight + GAP;
      // 밀려나는 맨 위 줄이 기록 행으로 날아간다(줄이 움직이기 전 자리에서)
      send(first);
      first.classList.add('leaving');
      requestAnimationFrame(() => place(h, true)); // 모두 한 칸 위로
      removal = window.setTimeout(() => {
        removal = 0;
        first.remove();
        place();
      }, 600);
    }
  };

  const running = () => motionAllowed() && !document.hidden && inView && (!root.classList.contains('story-pin') || scene.classList.contains('is-active'));
  const settled = () => {
    if (!root.classList.contains('story-pin')) return true;
    const s = Number(story.dataset.s ?? '1');
    return s >= SETTLED[0] && s <= SETTLED[1];
  };
  const tick = () => {
    timer = 0;
    if (!running()) return;
    // 장면 사이를 지나는 동안(기록 행이 스크롤로 차는 중)은 기다린다
    if (!settled()) { timer = window.setTimeout(tick, 400); return; }
    push();
    timer = window.setTimeout(tick, 2400);
  };
  const sync = () => {
    if (running()) { if (!timer) timer = window.setTimeout(tick, 1200); }
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
  // 그다음 보기 창 높이를 표시 줄 수에 맞춰 둔다(줄이 오갈 때 창 높이가 흔들리지 않게)
  /** 좁은 창의 영어 · 베트남어는 CSS가 처음부터 두 줄(story.css --two): 그때는 재지 않는다. 두 변수는 창(.live, 컨테이너) 안의 목록에 붙는다 */
  const cssVar = (name: string) => getComputedStyle(list).getPropertyValue(name).trim();
  const fix = () => {
    if (removal) { clearTimeout(removal); removal = 0; list.querySelector('.leaving')?.remove(); }
    box.classList.remove('two');
    if (cssVar('--two') !== '1') box.classList.toggle('two', !oneLineFits());
    // 두 줄 짜임이면 보이는 줄이 셋(story.css .live.two)
    visibleRows = Math.max(2, Math.min(5, Number(cssVar('--live-rows')) || 4));
    while (list.children.length > visibleRows) list.lastElementChild?.remove();
    while (list.children.length < visibleRows) list.append(make(pool[k++ % pool.length]));
    const rows = [...list.children].slice(0, visibleRows) as HTMLElement[];
    const h = rows.reduce((a, r) => a + r.offsetHeight, 0) + GAP * (rows.length - 1);
    if (h > 0) view.style.height = `${h}px`;
    if (list.classList.contains('abs')) place();
  };
  fix();
  list.classList.add('abs');
  place();
  let lastWidth = box.clientWidth;
  new ResizeObserver(() => {
    if (box.clientWidth !== lastWidth) { lastWidth = box.clientWidth; fix(); }
  }).observe(box);
  document.fonts?.ready.then(fix);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(box);
  new MutationObserver(sync).observe(scene, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  onMotionChange(sync);
}
