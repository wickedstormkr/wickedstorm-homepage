#!/usr/bin/env node
/**
 * 지금 사이트(homepage_renewal)의 홈 화면 문구를 섹션별 콘텐츠 파일로 옮긴다.
 *
 *   node scripts/migrate/extract-home.mjs <homepage_renewal 경로>
 *
 * 원본: 국문 index.html, en/ja/vi/index.html(build_i18n.py가 i18n/<lang>.json으로 만든 결과).
 * 결과: src/content/home/<lang>/<section>.json
 *
 * 문구는 원본 그대로 옮긴다(인라인 태그 span.g·b·br·span.nw 포함). 이 스크립트는
 * 이전용이다. 이전이 끝난 뒤의 정본은 src/content/home/ 이며, 문구는 거기서 고친다.
 * 원본 사이트가 바뀌어 다시 옮겨야 할 때만 다시 실행한다(덮어쓴다).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const SRC = process.argv[2];
if (!SRC) {
  console.error('사용법: node scripts/migrate/extract-home.mjs <homepage_renewal 경로>');
  process.exit(1);
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'src/content/home');
const LANGS = { ko: 'index.html', en: 'en/index.html', ja: 'ja/index.html', vi: 'vi/index.html' };

/* ---------- 도우미 ---------- */
const squash = (s) => s.replace(/\s+/g, ' ').trim();
/** 안쪽 HTML(인라인 태그 유지). 로고 심볼 img와 화살표 장식은 컴포넌트가 그리므로 뺀다. */
function html(el) {
  if (!el) throw new Error('요소 없음');
  const c = el.clone();
  c.querySelectorAll('img.sym').forEach((n) => n.remove());
  return squash(c.innerHTML);
}
/** 글자만(태그 없음). 엔티티는 풀어 둔다(속성·텍스트 양쪽에서 안전하게 쓰도록). */
const text = (el) => squash(el.text);
const attr = (el, name) => squash(el.getAttribute(name) ?? '');
const q = (root, sel) => {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`선택자 없음: ${sel}`);
  return el;
};
const qa = (root, sel) => root.querySelectorAll(sel);
/** "./img/x.webp", "../img/x.webp" → "x.webp" */
const imgName = (src) => src.replace(/^(\.\.?\/)+img\//, '').split('?')[0];
/** 섹션 머리: eyebrow + h2 + lead */
function head(sec) {
  const h = sec.querySelector('h2');
  const lead = sec.querySelector('.sec-head .sec-lead');
  return {
    eyebrow: html(q(sec, '.eyebrow')),
    title: html(h),
    ...(lead ? { lead: html(lead) } : {}),
  };
}

function extract(doc, lang) {
  const out = {};

  /* ---------- 공통: 메타, 헤더, 푸터 ---------- */
  const meta = (sel) => attr(q(doc, sel), 'content');
  const header = q(doc, 'header#hdr');
  const drawer = q(doc, 'nav.drawer');
  const navText = (href) => text(q(drawer, `a[href$="${href}"]`));
  const footer = q(doc, 'footer');
  const recruit = q(header, 'nav.main a[target="_blank"]');
  const fp = qa(footer, '.foot-grid p');
  out.common = {
    meta: {
      title: text(q(doc, 'title')),
      description: meta('meta[name="description"]'),
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      twitterTitle: meta('meta[name="twitter:title"]'),
      twitterDescription: meta('meta[name="twitter:description"]'),
    },
    skipLink: text(q(doc, '.skip-link')),
    homeLabel: attr(q(header, 'a.brand'), 'aria-label'),
    mainNavLabel: attr(q(header, 'nav.main'), 'aria-label'),
    drawerLabel: attr(drawer, 'aria-label'),
    menuOpen: attr(q(header, '#menuBtn'), 'aria-label'),
    langLabel: attr(q(header, '.lang-switch'), 'aria-label'),
    nav: {
      product: navText('#product'),
      learnhubble: navText('#learnhubble'),
      standards: navText('#standards'),
      news: navText('news.html'),
      resources: navText('#resources'),
      company: navText('#company'),
      recruit: text(recruit),
      recruitHref: attr(recruit, 'href'),
      recruitLabel: attr(recruit, 'aria-label'),
    },
    cta: text(q(header, 'nav.main a.cta')),
    ctaDrawer: text(q(drawer, 'a.cta')),
    footer: {
      company: html(fp[0]),
      address: html(fp[1]),
      contact: html(fp[2]),
      navLabel: attr(q(footer, '.foot-nav'), 'aria-label'),
      privacy: text(q(footer, '.foot-nav a[href$="privacy.html"]')),
      legal: html(q(footer, '.legal')),
    },
  };

  /* ---------- ① 히어로 ---------- */
  const hero = q(doc, '#hero');
  const trustHref = [
    '/news/2026-07-1edtech-korea.html',
    '/news/2024-07-lecognizer-procurement.html',
    '/news/2025-11-patent-anomaly.html',
  ];
  // 증빙 한 줄: 원본은 두 칸(1EdTech | GS · 특허)이다. 항목마다 원본 링크를 달기 위해 ' · '로 나눈다(문구는 그대로).
  const trust = qa(hero, '.hero-trust > span').flatMap((s) => html(s).split(' · '));
  if (trust.length !== 3) throw new Error(`[${lang}] 증빙 줄 항목 수가 3이 아님: ${trust.length}`);
  out.hero = {
    eyebrow: html(q(hero, '.eyebrow')),
    lines: qa(hero, 'h1 .line-inner').map(html),
    lead: html(q(hero, '.hero-lead')),
    ctaPrimary: text(q(hero, '.hero-cta .btn.p')),
    ctaSecondary: text(q(hero, '.hero-cta .btn.s')),
    trust: trust.map((t, i) => ({ html: t, href: trustHref[i] })),
    capture: {
      badge: html(q(hero, '.cap-badge')),
      live: text(q(hero, '.cap-live')),
      rows: qa(hero, '.xrow').map((r) => ({
        actor: text(q(r, '.chip.actor')),
        verb: text(q(r, '.chip.verb')),
        object: text(q(r, '.chip.object')),
        result: text(q(r, '.chip.result')),
      })),
      signalLabel: html(q(hero, '.ins-label')),
      signal: text(q(hero, '.ins-chip')),
    },
    overlay: { main: html(q(hero, '.ho-main')), sub: html(q(hero, '.ho-sub')) },
  };

  /* ---------- ② 파이프라인 ---------- */
  const pipeSec = q(doc, 'section[aria-labelledby="pipeline-title"]');
  const loop = q(pipeSec, '#pipeLoop');
  out.pipeline = {
    ...head(pipeSec),
    steps: qa(pipeSec, '.pipe .step').map((s) => {
      const ps = qa(s, ':scope > p');
      return {
        index: text(q(s, '.n em')),
        tag: text(q(s, '.n')).replace(/^\S+\s*·\s*/, ''),
        title: html(q(s, 'h3')),
        text: html(ps[0]),
        detail: html(q(s, '.step-detail span')),
      };
    }),
    loop: {
      index: text(q(loop, '.pl-idx')),
      title: html(q(loop, '.pl-title')),
      sub: html(q(loop, '.pl-sub')),
      steps: qa(loop, '.pl-step').map((s) => {
        const lab = q(s, '.pl-lab').clone();
        const num = text(q(lab, 'i'));
        lab.querySelector('i').remove();
        const img = q(s, 'img');
        return {
          num,
          label: html(lab),
          note: html(q(s, '.pl-note')),
          url: text(q(s, '.pl-bar em')),
          img: imgName(attr(img, 'src')),
          alt: attr(img, 'alt'),
        };
      }),
      arcText: html(q(loop, '.pl-arc-text')),
      caption: html(q(loop, 'figcaption')),
    },
  };

  /* ---------- ③ 제품 ---------- */
  const prod = q(doc, '#product');
  const loopImg = q(prod, '.loop-stage img');
  out.product = {
    ...head(prod),
    loop: {
      img: imgName(attr(loopImg, 'src')),
      alt: attr(loopImg, 'alt'),
      notes: qa(prod, '.loop-notes > li').map((li) => ({
        kind: li.classList.contains('ln-sol') ? 'solution' : 'role',
        style: attr(li, 'style'),
        role: li.querySelector('b') ? html(li.querySelector('b')) : undefined,
        pill: text(q(li, '.pill')),
        product: q(li, '.pill').classList.contains('lrs') ? 'lec' : 'lhb',
        desc: html(q(li, '.ln-desc')),
      })),
      caption: html(q(prod, '.loop-figure > figcaption')),
    },
    features: qa(prod, '.feature').map((f) => {
      const img = q(f, 'figure img');
      return {
        kicker: text(q(f, '.kick')),
        name: text(q(f, 'h3')),
        text: html(q(f, '.feat-copy > p:not(.kick)')),
        bullets: qa(f, '.feat-copy li').map(html),
        badge: html(q(f, '.feat-badge')),
        img: imgName(attr(img, 'src')),
        alt: attr(img, 'alt'),
        reverse: f.classList.contains('reverse'),
      };
    }),
    note: html(q(prod, ':scope > .wrap > p.note')),
  };

  /* ---------- ④ LearnHubble AI ---------- */
  const lh = q(doc, '#learnhubble');
  const fig = (f) => {
    const img = q(f, 'img');
    const cap = q(f, 'figcaption').clone();
    const num = text(q(cap, 'i'));
    cap.querySelector('i').remove();
    return { img: imgName(attr(img, 'src')), alt: attr(img, 'alt'), num, caption: html(cap) };
  };
  const demo = q(lh, '.lhub-cta a');
  out.learnhubble = {
    eyebrow: html(q(lh, '.eyebrow')),
    name: text(q(lh, '.lhub-name')),
    title: html(q(lh, 'h2')),
    lead: html(q(lh, '.sec-lead')),
    points: qa(lh, '.lhub-points li').map((li) => ({
      num: text(q(li, 'i')),
      title: html(q(li, 'b')),
      text: html(q(li, 'span')),
    })),
    principle: html(q(lh, '.lhub-principle')),
    cta: { label: text(demo), topic: attr(demo, 'data-topic') },
    main: fig(q(lh, '.lhub-main')),
    subs: qa(lh, '.lhub-sub figure').map(fig),
    note: html(q(lh, ':scope > .wrap > p.note')),
  };

  /* ---------- ⑤ 레퍼런스 ---------- */
  const ref = q(doc, '#references');
  const logos = q(ref, '.ref-logos img');
  out.references = {
    ...head(ref),
    cards: qa(ref, '.ref-card').map((c) => ({
      org: html(q(c, '.rorg')),
      title: html(q(c, 'h3')),
      text: html(q(c, 'h3 + p')),
      tags: qa(c, '.rtags span').map(html),
    })),
    logos: { img: imgName(attr(logos, 'src')), alt: attr(logos, 'alt') },
  };

  /* ---------- ⑥ 표준 ---------- */
  const std = q(doc, '#standards');
  out.standards = {
    ...head(std),
    badge: html(q(std, '.powered')),
    cards: qa(std, '.std-card').map((c) => {
      const st = q(c, '.st');
      return {
        name: text(q(c, '.k')),
        text: html(q(c, 'p')),
        status: ['apply', 'soon', 'ref'].find((k) => st.classList.contains(k)),
        statusLabel: text(st),
        products: html(q(c, '.pd')),
        href: attr(c, 'href'),
        ariaLabel: attr(c, 'aria-label'),
      };
    }),
  };

  /* ---------- ⑦ 소식 ---------- */
  const news = q(doc, '#news');
  const ch = q(news, '.channels');
  out.news = {
    eyebrow: html(q(news, '.eyebrow')),
    title: html(q(news, 'h2')),
    more: text(q(news, '.sec-more')),
    // 홈 카드 세 장의 언어별 제목·대체 글. 날짜·이미지·주소는 소식 컬렉션(src/content/posts)에서 온다.
    cards: qa(news, '.ncard').map((c) => ({
      id: attr(c, 'href').replace(/^.*news\//, '').replace(/\.html$/, ''),
      tag: text(q(c, '.ntag')),
      title: html(q(c, 'h3')),
      alt: attr(q(c, 'img'), 'alt'),
      more: text(q(c, '.nmore')),
    })),
    channels: {
      title: html(q(ch, '.ch-title')),
      sub: html(q(ch, '.ch-sub')),
      instagram: text(q(ch, '[data-social="instagram"] .ch-v')),
      blog: text(q(ch, '[data-social="blog"] .ch-v')),
    },
  };

  /* ---------- ⑧ 자료 ---------- */
  const res = q(doc, '#resources');
  out.resources = {
    ...head(res),
    cards: qa(res, '.res-card').map((c) => {
      const t = q(c, '.res-thumb');
      return {
        thumb: imgName(attr(t, 'src')),
        thumbAlt: attr(t, 'alt'),
        wide: t.classList.contains('wide'),
        title: html(q(c, 'h3')),
        text: html(q(c, '.res-body > p')),
        links: qa(c, '.res-links a').map((a) => ({
          label: text(a),
          file: attr(a, 'href').replace(/^(\.\.?\/)+/, '/'),
          lang: attr(a, 'lang'),
          id: attr(a, 'data-dl'),
        })),
      };
    }),
  };

  /* ---------- ⑨ 회사 ---------- */
  const co = q(doc, '#company');
  const hist = q(co, '#history');
  const vid = q(co, 'video');
  out.company = {
    ...head(co),
    slogan: {
      label: text(q(co, '.co-slogan span')),
      text: squash(q(co, '.co-slogan').text.replace(text(q(co, '.co-slogan span')), '')),
    },
    stats: qa(co, '.co-stat').map((s) => ({
      value: text(q(s, '[data-count]')),
      unit: s.querySelector('.unit') ? text(s.querySelector('.unit')) : '',
      label: html(q(s, ':scope > span')),
    })),
    film: { label: attr(vid, 'aria-label'), caption: html(q(co, '#film figcaption')) },
    history: {
      eyebrow: html(q(hist, '.eyebrow')),
      title: html(q(hist, '.hist-title')),
      listLabel: attr(q(hist, '.hist-list'), 'aria-label'),
      years: qa(hist, '.hist-item').map((it) => ({
        year: text(q(it, '.hist-year')),
        highlights: qa(it, '.hist-hl li').map((li) => {
          const a = li.querySelector('a');
          if (!a) return { html: html(li) };
          const c = a.clone();
          c.querySelectorAll('.arw').forEach((n) => n.remove());
          const href = attr(a, 'href').replace(/^(\.\.?\/)+/, '/');
          return { html: html(c), href };
        }),
        more: qa(it, '.hist-dim li').map(html),
      })),
      more: text(q(hist, '.hist-more')),
    },
  };

  /* ---------- ⑩ 문의 ---------- */
  const ct = q(doc, '#contact');
  const form = q(ct, '#cform');
  const labs = qa(ct, '.ci-info .lab').map(text);
  const lbl = (name) => {
    const el = q(form, `[name="${name}"]`).parentNode;
    const c = el.clone();
    c.querySelectorAll('input,select,textarea').forEach((n) => n.remove());
    return html(c);
  };
  const ph = (name) => attr(q(form, `[name="${name}"]`), 'placeholder');
  out.contact = {
    ...head(ct),
    info: {
      telLabel: labs[0],
      emailLabel: labs[1],
      addressLabel: labs[2],
      address: html(q(ct, '.ci-info p:not(.ci-note)')),
      note: html(q(ct, '.ci-note')),
    },
    form: {
      noscript: squash(q(form, 'noscript').innerHTML.replace(/^[\s\S]*?<p[^>]*>|<\/p>[\s\S]*$/g, '')).replace(/ style="[^"]*"/g, ''),
      name: { label: lbl('userName'), placeholder: ph('userName') },
      company: { label: lbl('userCompany'), placeholder: ph('userCompany') },
      email: { label: lbl('userEmail'), placeholder: ph('userEmail') },
      traffic: {
        label: lbl('userTraffic'),
        options: qa(form, 'select[name="userTraffic"] option').map((o) => ({
          value: attr(o, 'value'),
          ...(o.getAttribute('data-auto') ? { auto: attr(o, 'data-auto') } : {}),
          label: text(o),
        })),
      },
      trafficEtc: { label: html(q(form, '[data-etc-label]')), placeholder: ph('userTrafficEtc') },
      memo: { label: lbl('userMemo'), placeholder: ph('userMemo') },
      privacy: html(q(form, 'label.check')).replace(/<input[^>]*>\s*/, ''),
      submit: text(q(form, '[data-submit]')),
    },
  };

  return out;
}

/**
 * 옮기면서 고치는 곳(지금 사이트의 오류). 고친 내용은 PR 본문 '지금 사이트와 달라진 점'에 적는다.
 * 1) 문구 안 상대 경로(./privacy.html, ../privacy.html)를 사이트 루트 경로(/privacy.html)로.
 *    화면에 낼 때 base 경로를 붙인다(src/lib/url.ts withBase).
 * 2) 영·베 동의 문구에서 링크 뒤 띄어쓰기가 빠진 곳.
 */
function fixups(value) {
  if (typeof value === 'string') {
    return value
      .replace(/href="(?:\.\.?\/)+/g, 'href="/')
      .replace(/<\/a>(?=[A-Za-zÀ-ỹ])/g, '</a> ');
  }
  if (Array.isArray(value)) return value.map(fixups);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fixups(v)]));
  }
  return value;
}

for (const [lang, file] of Object.entries(LANGS)) {
  const doc = parse(readFileSync(path.join(SRC, file), 'utf8'), { comment: false });
  const data = fixups(extract(doc, lang));
  const dir = path.join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  for (const [section, value] of Object.entries(data)) {
    writeFileSync(path.join(dir, `${section}.json`), JSON.stringify(value, null, 2) + '\n');
  }
  console.log(`${lang}: ${Object.keys(data).length}개 파일`);
}
