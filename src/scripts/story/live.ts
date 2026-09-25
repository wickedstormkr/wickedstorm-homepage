/**
 * 장면 1 실시간 수집: 학습 활동이 xAPI 문장으로 한 줄씩 들어온다(시연 문장을 돌려 쓴다).
 * 다섯 줄이 차면 맨 위 줄이 올라가며 사라진다. 사라지는 줄의 점은 'story:record'로 알려, 그림 층이 그 점을 별로 바꿔
 * 배경 성운에 자리 잡게 한다(쌓인다). 그때마다 '오늘 수집' 수가 하나 는다(시연).
 * 움직임 멈춤·탭 숨김·장면 1이 보이지 않을 때는 멈춘다(KWCAG 6.2.2).
 */
import { motionAllowed, onMotionChange } from '../motion';

interface Row { a: string; v: string; o: string; r: string; verb: number }

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
  const countEl = box.querySelector<HTMLElement>('[data-live-count]');
  const numLocale = document.documentElement.lang === 'vi' ? 'vi-VN' : 'en-US';
  let count = Number((countEl?.textContent ?? '0').replace(/[^0-9]/g, '')) || 0;

  const make = (r: Row) => {
    const li = document.createElement('li');
    li.className = 'xrow in';
    li.dataset.verb = String(r.verb);
    const chip = (cls: string, txt: string) => { const s = document.createElement('span'); s.className = `chip ${cls}`; s.textContent = txt; return s; };
    const arw = () => { const s = document.createElement('span'); s.className = 'arw'; s.setAttribute('aria-hidden', 'true'); s.textContent = '→'; return s; };
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.setAttribute('aria-hidden', 'true');
    li.append(dot, chip('actor', r.a), arw(), chip('verb', r.v), arw(), chip('object', r.o), chip('result', r.r));
    return li;
  };

  const push = () => {
    const r = pool[k++ % pool.length];
    const li = make(r);
    list.append(li);
    if (list.children.length > 5) {
      const first = list.children[0] as HTMLElement;
      story.dispatchEvent(new CustomEvent('story:record', { detail: { el: first.querySelector('.dot'), verb: Number(first.dataset.verb) || 0 } }));
      if (countEl) countEl.textContent = (++count).toLocaleString(numLocale);
      const h = first.offsetHeight + GAP;
      first.classList.add('leaving');
      list.style.transition = 'transform .55s cubic-bezier(.3,.7,.25,1)';
      list.style.transform = `translateY(-${h}px)`;
      window.setTimeout(() => {
        first.remove();
        list.style.transition = 'none';
        list.style.transform = 'none';
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
  // 보기 창 높이를 다섯 줄에 맞춰 둔다(줄이 오갈 때 패널 높이가 흔들리지 않게)
  const fix = () => {
    const view = list.parentElement!;
    const rows = [...list.children].slice(0, 5) as HTMLElement[];
    const h = rows.reduce((a, r) => a + r.offsetHeight, 0) + GAP * (rows.length - 1);
    if (h > 0) view.style.height = `${h}px`;
  };
  fix();
  addEventListener('resize', fix);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(box);
  new MutationObserver(sync).observe(scene, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  onMotionChange(sync);
}
