/**
 * 움직임 상태 하나를 모든 연출이 함께 따른다.
 * - 멈춤: html.motion-paused (CSS가 반복 애니메이션을 멈춘다)
 * - 처음 상태: 저장된 선택 → 없으면 prefers-reduced-motion
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

function setPaused(paused: boolean, btn: HTMLElement | null, remember: boolean) {
  root.classList.toggle('motion-paused', paused);
  btn?.setAttribute('aria-pressed', String(paused));
  if (remember) {
    try { localStorage.setItem(KEY, paused ? 'paused' : 'running'); } catch { /* 무시 */ }
  }
  listeners.forEach((fn) => fn(!paused));
}

export function initMotion(btn: HTMLElement | null) {
  // head 인라인 스크립트가 붙여 둔 상태를 버튼에 반영
  setPaused(root.classList.contains('motion-paused'), btn, false);
  btn?.addEventListener('click', () => setPaused(motionAllowed(), btn, true));
  // 시스템 설정이 바뀌면(저장된 선택이 없을 때만) 따른다
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* 무시 */ }
    if (saved === null) setPaused(e.matches, btn, false);
  });
}
