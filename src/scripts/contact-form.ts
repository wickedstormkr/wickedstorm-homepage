/**
 * 문의 폼. 지금 사이트 js/main.js의 동작을 그대로 옮겼다(서버 계약 불변).
 * - 엔드포인트: src/config/client.ts CONTACT_API(지금 운영 중인 Lambda)
 * - 보내는 값: {name, affiliation, email, inquiry, userTraffic, userTrafficEtc?, subject}
 *   subject = 'Contact Us 문의 접수[ [EN]]: {이름}님 (소속: {소속})'
 * - honeypot(name="website"), 인라인 오류(필드 아래, 첫 오류로 포커스), 전송 중 버튼 잠금, 15초 제한
 * - 유입 경로: 인스타그램·블로그·박람회는 서버 값 목록을 늘리지 않도록 'etc'로 보내고 userTrafficEtc를 자동으로 채운다
 * - ?utm_source=instagram|ig|blog|naver_blog|fair|event 로 들어오면 유입 경로를 미리 골라 둔다(바꿀 수 있음)
 * - data-topic 버튼(예: LearnHubble AI 시연 요청)으로 들어오면 문의사항 첫 줄을 채운다
 */
import { CONTACT_API } from '../config/client';

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
  sel.addEventListener('change', () => { syncTraffic(true); clearErr(sel); });

  // UTM으로 유입 경로 미리 고르기
  (() => {
    let src = '';
    try { src = (new URLSearchParams(location.search).get('utm_source') ?? '').toLowerCase(); } catch { /* 무시 */ }
    const MAP: Record<string, string> = { instagram: '인스타그램', ig: '인스타그램', blog: '블로그', naver_blog: '블로그', fair: '박람회·행사', event: '박람회·행사' };
    const want = MAP[src];
    if (!want) return;
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].getAttribute('data-auto') === want) { sel.selectedIndex = i; syncTraffic(false); break; }
    }
  })();

  // 시연 요청 등 data-topic 버튼
  document.querySelectorAll<HTMLAnchorElement>('a[data-topic]').forEach((a) => {
    a.addEventListener('click', () => {
      const memo = field('userMemo');
      const t = a.dataset.topic ?? '';
      if (memo && !memo.value.trim()) memo.value = t + '\n';
    });
  });

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
    const name = field('userName').value.trim();
    const aff = field('userCompany').value.trim();
    const payload: Record<string, string> = {
      name,
      affiliation: aff,
      email: field('userEmail').value.trim(),
      inquiry: field('userMemo').value.trim(),
      userTraffic: sel.value,
      subject: 'Contact Us 문의 접수' + (LANG === 'ko' ? '' : ' [' + LANG.toUpperCase() + ']') + ': ' + name + '님 (소속: ' + aff + ')',
    };
    if (NEED.includes(sel.value) && etcIn.value.trim()) payload.userTrafficEtc = etcIn.value.trim();
    btn.disabled = true;
    set(TX.sending);
    fetch(CONTACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
      .then((r) => {
        if (!r.ok) throw new Error('bad');
        set(TX.sent, 'ok');
        f.reset();
        etc.hidden = true;
        etcIn.required = false;
      })
      .catch(() => set(TX.failed, 'err'))
      .finally(() => { btn.disabled = false; });
  });
}
