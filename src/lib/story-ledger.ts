/**
 * 장면 2 기록 행의 모양과 결정적 난수. 첫 로드 스크립트(실시간 수집 창, story/live.ts)도 기록 칸 자리를 알아야 해서
 * 무거운 입자 모델(story-data.ts)과 나눠 둔다. story-data.ts가 그대로 다시 내보낸다.
 */

/** 결정적 난수(mulberry32) */
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 장면 2 기록 행(지금 사이트의 기록 레저를 따른다): 한 줄이 학습데이터 한 건.
 * 줄마다 네 칸 알약이 줄 전체를 빈틈없이 채운다: 누가(actor) 파랑 · ~하다(xAPI verb ⇄ Caliper action) 보라 ·
 * 무엇을(object) 마젠타 · 부가 정보(xAPI context·result ⇄ Caliper edApp·group·session 등) 강조색.
 * 칸 너비는 줄마다 조금씩 다르고(값의 길이가 다르다), 부가 정보 칸이 가장 넓다. 다 쓰면 알약이 끝까지 차고 확인 점이 찍힌다.
 * 좌표는 기록 칸(ledger box) 기준 0~1.
 */
export const SLOTS = ['actor', 'verb', 'object', 'extra'] as const;
/** 칸 색 = 활동 종류 색과 같은 넷(파랑 · 보라 · 마젠타 · 강조색) */
export const SLOT_COLOR = ['#2f7cff', '#7c4dff', '#e930b0', '#a3b1ff'];
export interface LedgerPill { x: number; w: number; slot: number; cap: number }
export interface LedgerRow { y: number; pills: LedgerPill[] }
export const LEDGER_ASPECT = 3.1;
export const LEDGER = (() => {
  const r = rng(11);
  const px0 = 0.03;
  const px1 = 0.955;
  const gap = 0.008;
  const N = 6;
  const avail = px1 - px0 - (SLOTS.length - 1) * gap;
  const rows: LedgerRow[] = Array.from({ length: N }, (_, i) => {
    const f = [0.14 + r() * 0.06, 0.18 + r() * 0.08, 0.2 + r() * 0.1];
    f.push(1 - f[0] - f[1] - f[2]);
    let x = px0;
    const pills = f.map((fr, slot) => {
      const w = fr * avail;
      const pl = { x, w, slot, cap: Math.max(4, Math.min(16, Math.round(w * 60))) };
      x += w + gap;
      return pl;
    });
    return { y: (i + 0.5) / N, pills };
  });
  return { rows, px0, px1, gap, headX: 0.012, checkX: 0.978, pillH: 0.07 };
})();
