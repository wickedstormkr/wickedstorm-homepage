/**
 * 유입 기억(마케팅 분석, docs/marketing/analytics.md). 모든 페이지에서 불러온다(site.ts, contact-form.ts).
 *
 * - 방문마다 UTM과 거쳐 온 사이트를 보고 이 브라우저에 남긴다. 개인을 알아볼 정보는 담지 않는다.
 *   · 첫 방문(first): 처음 들어온 유입. 6개월 지나면 새로 잡는다
 *   · 최근 유입(last): 직접 방문이 아닌 마지막 유입(검색 · SNS · 캠페인 링크 …). 90일
 *   · 이번 방문(visit): 이 탭에서 이번에 들어온 유입과 첫 페이지(탭을 닫으면 사라진다)
 * - 문의로 가는 링크를 누르면 어디서 눌렀는지(페이지 · 영역)와 목적(data-purpose · data-product)을 이번 방문에 남긴다.
 * - 문의 폼이 보낼 때 읽어 메일의 '접수 정보'와 GA4 generate_lead에 싣는다. 누른 곳(ws-entry)만은 문의 목적을 고르거나 폼에 처음 입력할 때
 *   contact_start의 entry로도 GA4에 간다(개인정보처리방침 1 · 7항). 나머지는 문의를 보내지 않으면 어디로도 가지 않는다.
 * 저장소를 쓸 수 없는 브라우저(사생활 보호 창 등)에서는 조용히 아무것도 남기지 않는다.
 */

export interface Touch {
  /** utm_source, 없으면 거쳐 온 사이트(google · naver · instagram … 또는 호스트), 둘 다 없으면 (direct) */
  src: string;
  /** utm_medium, 없으면 organic(검색) · social · referral, 직접 방문은 (none) */
  med: string;
  cmp?: string;
  cnt?: string;
  trm?: string;
  /** 거쳐 온 사이트의 호스트 */
  ref?: string;
  /** 도착한 페이지(사이트 루트 기준 경로, 예: /en/product.html) */
  land: string;
  /** 방문자 기준 날짜 YYYY-MM-DD */
  at: string;
  t: number;
}
export interface Entry {
  /** 문의 링크를 누른 페이지(pageKey)와 영역(섹션 id · header · menu …) */
  page: string;
  area: string;
  purpose?: string;
  product?: string;
  t: number;
}

const DAY = 864e5;
const FIRST_DAYS = 180;
const LAST_DAYS = 90;
const K = { first: 'ws-first', last: 'ws-last', visit: 'ws-visit', entry: 'ws-entry' };
const BASE = import.meta.env.BASE_URL;

const store = (s: 'local' | 'session') => {
  try { return s === 'local' ? window.localStorage : window.sessionStorage; } catch { return null; }
};
function read<T>(s: 'local' | 'session', key: string): T | null {
  try { const v = store(s)?.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function write(s: 'local' | 'session', key: string, v: unknown) {
  try { store(s)?.setItem(key, JSON.stringify(v)); } catch { /* 저장소 없음 */ }
}

const pad = (n: number) => String(n).padStart(2, '0');
export const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clean = (v: string | null) => (v ?? '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 80) || undefined;
const bare = (h: string) => h.replace(/^www\./, '').toLowerCase();

/** 사이트 루트 기준 경로(base 경로를 뺀다): /wickedstorm-homepage/en/ → /en/ */
export const sitePath = (pathname = location.pathname) => '/' + (pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, ''));

/** 페이지 이름: /en/product.html → product, / → home, /news/<id>.html → news/<id> */
export function pageKey(pathname = location.pathname): string {
  const p = sitePath(pathname).slice(1).replace(/^(en|ja|vi)(\/|$)/, '').replace(/\.html$/, '').replace(/\/$/, '');
  return !p || p === 'index' ? 'home' : p;
}

/** 거쳐 온 사이트 → [이름, 매체]. 도메인 끝으로 맞춘다(t.me · blog.naver.com 같은 이웃 주소를 잘못 묶지 않게) */
const REFERRERS: [RegExp, string, string][] = [
  [/(^|\.)google\.[a-z.]+$/, 'google', 'organic'],
  [/(^|\.)search\.naver\.com$/, 'naver', 'organic'],
  [/(^|\.)search\.daum\.net$/, 'daum', 'organic'],
  [/(^|\.)bing\.com$/, 'bing', 'organic'],
  [/(^|\.)yahoo\.[a-z.]+$/, 'yahoo', 'organic'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo', 'organic'],
  [/(^|\.)coccoc\.com$/, 'coccoc', 'organic'],
  [/(^|\.)baidu\.com$/, 'baidu', 'organic'],
  // 네이버 블로그는 UTM 규칙의 blog와 같은 이름으로(블로그 글 속 링크에 UTM을 빠뜨려도 같은 줄에 모이게)
  [/(^|\.)blog\.naver\.com$/, 'blog', 'referral'],
  [/(^|\.)instagram\.com$/, 'instagram', 'social'],
  [/(^|\.)(facebook|fb)\.com$/, 'facebook', 'social'],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, 'linkedin', 'social'],
  [/^t\.co$|(^|\.)(x|twitter)\.com$/, 'x', 'social'],
  [/(^|\.)youtube\.com$|^youtu\.be$/, 'youtube', 'social'],
  [/(^|\.)kakao\.com$/, 'kakao', 'social'],
  [/(^|\.)zalo\.me$/, 'zalo', 'social'],
  [/(^|\.)threads\.net$/, 'threads', 'social'],
  [/(^|\.)line\.me$/, 'line', 'social'],
  [/(^|\.)tiktok\.com$/, 'tiktok', 'social'],
];

/** 이번 페이지 열림의 유입. 사이트 안 이동 · 새로고침이면 null */
function touchNow(): Touch | null {
  const q = new URLSearchParams(location.search);
  let ref: string | undefined;
  try { if (document.referrer) ref = bare(new URL(document.referrer).hostname); } catch { /* 잘못된 주소 */ }
  if (ref === bare(location.hostname)) ref = undefined;
  const base = { land: sitePath(), at: today(), t: Date.now(), ...(ref && { ref }) };
  const src = clean(q.get('utm_source'));
  if (src) {
    const opt = { cmp: clean(q.get('utm_campaign')), cnt: clean(q.get('utm_content')), trm: clean(q.get('utm_term')) };
    return { ...base, src, med: clean(q.get('utm_medium')) ?? '(not set)', ...Object.fromEntries(Object.entries(opt).filter(([, v]) => v)) };
  }
  if (!ref) return null;
  const hit = REFERRERS.find(([re]) => re.test(ref));
  return hit ? { ...base, src: hit[1], med: hit[2] } : { ...base, src: ref, med: 'referral' };
}

const fresh = (x: Touch | null, days: number) => (x && Date.now() - x.t < days * DAY ? x : null);

/** 페이지를 열 때 한 번: 첫 방문 · 최근 유입 · 이번 방문을 갱신한다 */
function capture() {
  const now = touchNow();
  const direct: Touch = { src: '(direct)', med: '(none)', land: sitePath(), at: today(), t: Date.now() };
  if (!fresh(read<Touch>('local', K.first), FIRST_DAYS)) write('local', K.first, now ?? direct);
  if (now) write('local', K.last, now);
  if (now || !read<Touch>('session', K.visit)) write('session', K.visit, now ?? direct);
}

/** 문의로 가는 링크인가: 문의 페이지(어느 언어든), 또는 이 페이지 · 홈의 #contact · #cform */
function isContactLink(a: HTMLAnchorElement): boolean {
  let u: URL;
  try { u = new URL(a.href, location.href); } catch { return false; }
  if (u.origin !== location.origin) return false;
  if (pageKey(u.pathname) === 'contact') return true;
  return (u.hash === '#contact' || u.hash === '#cform') && ['home', pageKey()].includes(pageKey(u.pathname));
}

/** 링크가 놓인 영역: data-entry, 가장 가까운 섹션 · 글의 id, 아니면 머리 · 바닥 같은 큰 구역 */
export function areaOf(el: Element): string {
  const tagged = el.closest<HTMLElement>('[data-entry]')?.dataset.entry;
  if (tagged) return tagged;
  const sec = el.closest('section[id], article[id]');
  if (sec) return sec.id;
  return el.closest('header, footer, nav, article, main')?.localName ?? 'page';
}

/** 모든 페이지: 문의로 가는 링크를 누르면 누른 곳과 목적을 이번 방문에 남긴다 */
document.addEventListener('click', (ev) => {
  const a = (ev.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a || !isContactLink(a)) return;
  const e: Entry = { page: pageKey(), area: areaOf(a), t: Date.now() };
  if (a.dataset.purpose) e.purpose = a.dataset.purpose;
  if (a.dataset.product) e.product = a.dataset.product;
  write('session', K.entry, e);
}, true);

capture();

export interface Attribution {
  first: Touch | null;
  /** 이번 방문의 유입. 이번에 직접 들어왔으면 90일 안의 최근 유입(마지막 유입 기준, GA4와 같은 방식) */
  last: Touch | null;
  /** 이번 방문이 직접 방문인데 last를 최근 유입에서 가져왔는가 */
  lastFromEarlier: boolean;
  visit: Touch | null;
  entry: Entry | null;
}
/** 문의 폼이 보낼 때 읽는다 */
export function attribution(): Attribution {
  const visit = read<Touch>('session', K.visit);
  const direct = !visit || visit.src === '(direct)';
  const earlier = direct ? fresh(read<Touch>('local', K.last), LAST_DAYS) : null;
  return { first: read<Touch>('local', K.first), last: direct ? earlier : visit, lastFromEarlier: !!earlier, visit, entry: read<Entry>('session', K.entry) };
}
/** 문의를 보낸 뒤: 누른 곳은 지운다(다음 문의에 섞이지 않게). 유입 기록은 그대로 */
export function clearEntry() {
  try { store('session')?.removeItem(K.entry); } catch { /* 무시 */ }
}

/** GA4 이벤트. GA는 운영 배포에서만 실린다(없으면 아무것도 하지 않는다). 이름 · 이메일 같은 개인정보는 넣지 않는다 */
export function track(name: string, params: Record<string, string | undefined>) {
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g !== 'function') return;
  g('event', name, Object.fromEntries(Object.entries(params).filter(([, v]) => v).map(([k, v]) => [k, v!.slice(0, 100)])));
}
