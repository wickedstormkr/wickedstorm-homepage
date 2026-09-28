/**
 * 문의 폼. 서버는 지금 운영 중인 Lambda 그대로(보내는 값의 이름과 모양은 바꾸지 않는다).
 * - 엔드포인트: src/config/client.ts CONTACT_API
 * - 보내는 값: {name, affiliation, email, inquiry, userTraffic, userTrafficEtc?, subject}
 *   · subject = '[웹 문의 · 시연 요청 · LearnHubble AI · EN] 소속 · 이름' (목적 · 관심 제품 · 언어는 있을 때만)
 *   · inquiry = 적은 문의 + '[접수 정보]'(접수 번호, 목적, 문의한 곳, 이번 유입 · 첫 방문, 유입 경로 응답). 메일은 한국 팀이 읽으므로 한국어로
 * - 문의 목적: 폼 위 카드가 라디오(form="cform"). 고르면 문의사항 안내 글(placeholder)이 목적에 맞게 바뀐다
 *   · 다른 페이지의 버튼(data-purpose · data-product)에서 오거나 주소에 ?purpose=demo&product=learnhubble가 있으면 미리 고른다
 * - 유입 경로(자기 응답): 인스타그램 · 블로그 · 박람회는 서버 값 목록을 늘리지 않도록 'etc'로 보내고 userTrafficEtc를 자동으로 채운다
 *   · 이번 방문의 유입(utm_source 또는 거쳐 온 사이트)이 instagram|ig|blog|naver_blog|fair|event면 미리 골라 두고, 메일에 '방문 경로로 미리 선택됨'을 적는다
 * - GA4: 처음 손대면 contact_start, 접수되면 generate_lead(접수 번호 · 목적 · 제품 · 문의한 곳 · 언어 · 유입 경로 응답). 개인정보는 보내지 않는다
 * - honeypot(name="website"), 인라인 오류(필드 아래, 첫 오류로 포커스), 전송 중 버튼 잠금, 15초 제한
 */
import { CONTACT_API } from '../config/client';
import { attribution, clearEntry, pageKey, sitePath, today, track, type Entry, type Touch } from './attribution';

interface FormText {
  field: Record<string, string>;
  emailFmt: string;
  required: string;
  etcDirect: string;
  etcOther: string;
  sending: string;
  sent: string;
  failed: string;
}

/** 메일은 한국 팀이 읽는다: 목적 · 페이지 · 유입 경로 이름은 어느 언어 페이지에서 보내든 한국어로 */
const PURPOSE_KO: Record<string, string> = { consult: '도입 상담', demo: '시연 요청', partner: '파트너십·해외' };
const PRODUCTS: Record<string, string> = { lecognizer: 'Lecognizer', 'lecognizer-ai': 'Lecognizer AI', learnhubble: 'LearnHubble AI' };
const LANG_KO: Record<string, string> = { ko: '한국어', en: '영어', ja: '일본어', vi: '베트남어' };
const PAGE_KO: Record<string, string> = { home: '홈', product: '제품', standards: '표준', cases: '사례', trust: '신뢰', company: '회사', contact: '문의 페이지', news: '소식 목록', links: '링크 모음' };
const AREA_KO: Record<string, string> = {
  header: '헤더의 도입 문의', menu: '모바일 메뉴의 도입 문의', 'cta-band': '페이지 끝 문의 띠', learnhubble: 'LearnHubble AI 시연 요청',
  'scene-next': '오프닝 마지막 장면', footer: '푸터', article: '기사 본문 링크', main: '본문 링크', form: '문의 칸에서 바로',
};
const TRAFFIC_KO: Record<string, string> = { direct: '직접 입력', portal: '포털 검색', job_posting: '구인 공고', news: '기사/뉴스', referral: '지인 추천/공유', etc: '기타' };
/** 자기 응답 → 분석용 코드(인스타그램 · 블로그 · 박람회는 서버에 etc + 이름으로 간다) */
const AUTO_CODE: Record<string, string> = { 인스타그램: 'instagram', 블로그: 'blog', '박람회·행사': 'event' };
/** 이번 방문의 utm_source → 미리 고를 유입 경로(docs/marketing/analytics.md의 UTM 규칙) */
const PREFILL: Record<string, string> = { instagram: '인스타그램', ig: '인스타그램', blog: '블로그', naver_blog: '블로그', fair: '박람회·행사', event: '박람회·행사' };
/** 다른 페이지에서 누른 버튼(목적 · 누른 곳)은 30분 안에 폼을 열 때만 이어받는다 */
const ENTRY_FRESH = 30 * 60e3;
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const f = document.getElementById('cform') as HTMLFormElement | null;
if (f) init(f);

function init(f: HTMLFormElement) {
  const TX = JSON.parse(f.dataset.msg ?? '{}') as FormText;
  const LANG = (document.documentElement.lang || 'ko').slice(0, 2);
  const status = f.querySelector<HTMLElement>('[data-status]')!;
  const btn = f.querySelector<HTMLButtonElement>('[data-submit]')!;
  const sel = f.elements.namedItem('userTraffic') as HTMLSelectElement;
  const etc = f.querySelector<HTMLElement>('[data-etc]')!;
  const etcIn = etc.querySelector('input')!;
  const etcLab = etc.querySelector<HTMLElement>('[data-etc-label]')!;
  const NEED = ['direct', 'etc'];
  const FIELDS = ['userName', 'userCompany', 'userEmail', 'userTraffic', 'userTrafficEtc', 'userMemo', 'checkPrivacy'];
  type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const field = (n: string) => f.elements.namedItem(n) as Field;
  const memo = field('userMemo') as HTMLTextAreaElement;
  const memoHint = memo.placeholder;

  const msgFor = (el: Field) =>
    el instanceof HTMLInputElement && el.type === 'email' && el.validity.typeMismatch ? TX.emailFmt : TX.field[el.name] ?? TX.required;
  const errHost = (el: Field) => (el.closest('label') ?? el.parentElement)!;
  function showErr(el: Field) {
    const host = errHost(el);
    let e = host.querySelector<HTMLElement>('.field-err');
    if (!e) {
      e = document.createElement('span');
      e.className = 'field-err';
      e.id = 'err-' + el.name;
      host.appendChild(e);
    }
    e.textContent = msgFor(el);
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', e.id);
  }
  function clearErr(el: Field) {
    errHost(el).querySelector('.field-err')?.remove();
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  }

  /* ---------- 유입 경로(자기 응답) ---------- */
  let prefilled = false;
  const autoOf = () => sel.options[sel.selectedIndex]?.getAttribute('data-auto') ?? null;
  function syncTraffic(focus: boolean) {
    const auto = autoOf();
    const need = NEED.includes(sel.value) && !auto;
    etc.hidden = !need;
    etcIn.required = need;
    if (auto) {
      etcIn.value = auto;
      clearErr(etcIn);
    } else if (need) {
      etcIn.value = '';
      etcLab.textContent = sel.value === 'direct' ? TX.etcDirect : TX.etcOther;
      if (focus) etcIn.focus();
    } else {
      etcIn.value = '';
      clearErr(etcIn);
    }
  }
  sel.addEventListener('change', () => { prefilled = false; syncTraffic(true); clearErr(sel); });
  function prefillTraffic() {
    const want = PREFILL[attribution().visit?.src ?? ''];
    if (!want) return;
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].getAttribute('data-auto') === want) { sel.selectedIndex = i; prefilled = true; syncTraffic(false); break; }
    }
  }
  prefillTraffic();

  /* ---------- 문의 목적(폼 위 카드 = 라디오) ---------- */
  const radios = [...document.querySelectorAll<HTMLInputElement>('input[name="purpose"][form="cform"]')];
  let product = '';
  const purposeNow = () => radios.find((r) => r.checked)?.value ?? '';
  const syncPurpose = () => { memo.placeholder = radios.find((r) => r.checked)?.dataset.placeholder || memoHint; };
  function choose(purpose?: string, prod?: string) {
    const r = radios.find((x) => x.value === purpose);
    if (r) r.checked = true;
    product = prod && PRODUCTS[prod] ? prod : '';
    syncPurpose();
  }
  radios.forEach((r) => r.addEventListener('change', syncPurpose));
  // 누른 버튼: 폼을 연 때보다 30분 안에 다른 페이지에서 눌렀거나, 연 뒤 이 페이지에서 누른 것만(문의를 오래 써도 사라지지 않게)
  const openedAt = Date.now();
  const freshEntry = (): Entry | null => {
    const e = attribution().entry;
    return e && e.t > openedAt - ENTRY_FRESH ? e : null;
  };
  // 들어올 때: 주소의 ?purpose=&product=(캠페인 링크)가 먼저, 없으면 다른 페이지에서 누른 버튼
  (() => {
    const q = new URLSearchParams(location.search);
    if (q.get('purpose') || q.get('product')) return choose(q.get('purpose') ?? undefined, q.get('product') ?? undefined);
    const e = freshEntry();
    if (e?.purpose || e?.product) choose(e.purpose, e.product);
  })();
  // 같은 페이지 안의 버튼(홈의 LearnHubble AI 시연 요청 · 오프닝 마지막 장면)
  document.addEventListener('click', (ev) => {
    const a = (ev.target as Element | null)?.closest?.('a[data-purpose]') as HTMLAnchorElement | null;
    if (a && (a.hash === '#contact' || a.hash === '#cform') && a.pathname === location.pathname) choose(a.dataset.purpose, a.dataset.product);
  });

  /* ---------- 분석: 처음 손대면 contact_start 한 번 ---------- */
  const entryCode = () => { const e = freshEntry(); return e ? `${e.page}#${e.area}` : `${pageKey()}#form`; };
  let started = false;
  const onStart = () => {
    if (started) return;
    started = true;
    track('contact_start', { purpose: purposeNow() || 'general', entry: entryCode(), form_lang: LANG });
  };
  f.addEventListener('input', onStart);
  f.addEventListener('change', onStart);
  radios.forEach((r) => r.addEventListener('change', onStart));

  /* ---------- 보낼 값 ---------- */
  const one = (s: string, n: number) => {
    const t = s.replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  };
  let leadId = '';
  const newId = () => {
    const b = new Uint8Array(4);
    crypto.getRandomValues(b);
    return `WS-${today().slice(2).replace(/-/g, '')}-${[...b].map((x) => ID_CHARS[x % 32]).join('')}`;
  };
  const touchText = (x: Touch) =>
    x.src === '(direct)'
      ? '직접 방문(주소 입력 · 즐겨찾기 · 메신저 등)'
      : [x.src, x.med, x.cmp].filter(Boolean).join(' / ') + (x.cnt ? ` · ${x.cnt}` : '') + (x.trm ? ` · 검색어 ${x.trm}` : '');
  const pageName = (k: string) => PAGE_KO[k] ?? (k.startsWith('news/') ? `소식 기사 ${k.slice(5)}` : k);
  function receipt(purpose: string): string {
    const a = attribution();
    const e = freshEntry();
    const where = e ? `${pageName(e.page)} · ${AREA_KO[e.area] ?? e.area}` : `${pageName(pageKey())} · ${AREA_KO.form}`;
    const auto = autoOf();
    const told = auto ?? TRAFFIC_KO[sel.value] ?? sel.value;
    const typed = !auto && etcIn.value.trim() ? `: ${one(etcIn.value, 60)}` : '';
    return [
      '----------------------------------------',
      '[접수 정보] 홈페이지가 자동으로 붙인 정보입니다.',
      `접수 번호: ${leadId}`,
      `문의 목적: ${PURPOSE_KO[purpose] ?? '고르지 않음'}`,
      product && `관심 제품: ${PRODUCTS[product]}`,
      `문의 언어: ${LANG_KO[LANG] ?? LANG} (${sitePath()})`,
      `문의한 곳: ${where} (${entryCode()})`,
      a.last
        ? `이번 유입: ${touchText(a.last)} (${a.last.at}, 첫 페이지 ${a.last.land})${a.lastFromEarlier ? ' · 이번에는 직접 방문' : ''}`
        : '이번 유입: 직접 방문',
      a.first && `첫 방문: ${a.first.at} · ${touchText(a.first)} (첫 페이지 ${a.first.land})`,
      `유입 경로(응답): ${told}${typed}${prefilled ? ' (방문 경로로 미리 선택됨)' : ''}`,
    ].filter(Boolean).join('\n');
  }

  const set = (m: string, t = '') => { status.textContent = m; status.className = 'status ' + t; };
  ['userName', 'userCompany', 'userEmail', 'userTrafficEtc', 'userMemo'].forEach((n) => field(n)?.addEventListener('input', () => clearErr(field(n))));
  field('checkPrivacy').addEventListener('change', () => clearErr(field('checkPrivacy')));

  f.addEventListener('submit', (e) => {
    e.preventDefault();
    if (field('website').value) return; // honeypot
    let firstInvalid: Field | null = null;
    for (const n of FIELDS) {
      const el = field(n);
      if (!el) continue;
      if (el.willValidate && !el.checkValidity()) { showErr(el); firstInvalid ??= el; } else clearErr(el);
    }
    if (firstInvalid) { firstInvalid.focus(); return; }
    // 전송이 실패해 다시 보내도 같은 접수 번호(서버가 받았는데 응답만 늦은 경우 중복을 알아볼 수 있게)
    leadId ||= newId();
    const purpose = purposeNow();
    const name = field('userName').value.trim();
    const aff = field('userCompany').value.trim();
    const tags = ['웹 문의', PURPOSE_KO[purpose], PRODUCTS[product], LANG === 'ko' ? '' : LANG.toUpperCase()].filter(Boolean).join(' · ');
    const payload: Record<string, string> = {
      name,
      affiliation: aff,
      email: field('userEmail').value.trim(),
      inquiry: memo.value.trim() + '\n\n' + receipt(purpose),
      userTraffic: sel.value,
      subject: `[${tags}] ${one(aff, 40)} · ${one(name, 20)}`,
    };
    if (NEED.includes(sel.value) && etcIn.value.trim()) payload.userTrafficEtc = etcIn.value.trim();
    const lead = {
      lead_id: leadId, purpose: purpose || 'general', product: product || undefined, entry: entryCode(), form_lang: LANG,
      traffic: AUTO_CODE[autoOf() ?? ''] ?? sel.value,
    };
    btn.disabled = true;
    set(TX.sending);
    fetch(CONTACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(35000),
    })
      .then((r) => {
        if (!r.ok) throw new Error('bad');
        set(TX.sent, 'ok');
        track('generate_lead', lead);
        f.reset();
        etc.hidden = true;
        etcIn.required = false;
        product = '';
        prefilled = false;
        started = false;
        leadId = '';
        syncPurpose();
        clearEntry();
      })
      .catch(() => set(TX.failed, 'err'))
      .finally(() => { btn.disabled = false; });
  });
}
