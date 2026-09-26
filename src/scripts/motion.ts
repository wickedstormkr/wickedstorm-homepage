/**
 * 움직임 상태 하나를 모든 연출이 함께 따른다.
 * - 멈춤: html.motion-paused (CSS가 반복 애니메이션을 멈춘다)
 * - 처음 상태: 저장된 선택 → 없으면 prefers-reduced-motion
 * - 조작: 오프닝 이야기 조작의 '움직임 멈춤' 버튼([data-motion-btn]). 저절로 계속 움직이는 것(실시간 수집 · 떠다니는 입자 · 반짝임)은
 *   오프닝에만 있어 조작도 거기에만 둔다(KWCAG 6.2.2). 버튼이 여럿이어도 같은 상태를 보인다.
 * 2단계의 입자·스크롤 연출도 motionAllowed()/onMotionChange()로 이 상태를 따른다.
 */
const KEY = 'ws-motion';
const root = document.documentElement;
const listeners = new Set<(allowed: boolean) => void>();

export const motionAllowed = () => !root.classList.contains('motion-paused');

export function onMotionChange(fn: (allowed: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setPaused(paused: boolean, btns: HTMLElement[], remember: boolean) {
  root.classList.toggle('motion-paused', paused);
  btns.forEach((b) => b.setAttribute('aria-pressed', String(paused)));
  if (remember) {
    try { localStorage.setItem(KEY, paused ? 'paused' : 'running'); } catch { /* 무시 */ }
  }
  listeners.forEach((fn) => fn(!paused));
}

export function initMotion(btns: HTMLElement[]) {
  // head 인라인 스크립트가 붙여 둔 상태를 버튼에 반영
  setPaused(root.classList.contains('motion-paused'), btns, false);
  btns.forEach((b) => b.addEventListener('click', () => setPaused(motionAllowed(), btns, true)));
  // 시스템 설정이 바뀌면(저장된 선택이 없을 때만) 따른다
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* 무시 */ }
    if (saved === null) setPaused(e.matches, btns, false);
  });
}
