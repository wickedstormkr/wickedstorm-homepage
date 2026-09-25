/**
 * 홈 화면 문구: src/content/home/<lang>/<section>.json
 * 모양(키·배열 길이)은 국문 파일이 기준이고, 네 언어가 같은 모양이어야 한다
 * (scripts/checks/content.mjs가 CI에서 확인). 타입도 국문 파일에서 얻는다.
 */
import type { Lang } from './i18n';
import type common from '../content/home/ko/common.json';
import type hero from '../content/home/ko/hero.json';
import type product from '../content/home/ko/product.json';
import type learnhubble from '../content/home/ko/learnhubble.json';
import type cases from '../content/home/ko/cases.json';
import type trust from '../content/home/ko/trust.json';
import type standards from '../content/home/ko/standards.json';
import type news from '../content/home/ko/news.json';
import type resources from '../content/home/ko/resources.json';
import type company from '../content/home/ko/company.json';
import type contact from '../content/home/ko/contact.json';
import type story from '../content/home/ko/story.json';
import type ui from '../content/ui/ko.json';

export interface HomeContent {
  common: typeof common;
  hero: typeof hero;
  product: typeof product;
  learnhubble: typeof learnhubble;
  cases: typeof cases;
  trust: typeof trust;
  standards: typeof standards;
  news: typeof news;
  resources: typeof resources;
  company: typeof company;
  contact: typeof contact;
  story: typeof story;
}
export type UiText = typeof ui;

const files = import.meta.glob<{ default: unknown }>('../content/home/*/*.json', { eager: true });
const uiFiles = import.meta.glob<{ default: UiText }>('../content/ui/*.json', { eager: true });

function load(lang: Lang): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [p, mod] of Object.entries(files)) {
    const m = /home\/([a-z]+)\/([a-z]+)\.json$/.exec(p);
    if (m && m[1] === lang) out[m[2]] = mod.default;
  }
  return out;
}

/**
 * 번역 전 임시: 국문에 새로 생긴 문구가 다른 언어 파일에 아직 없으면 국문을 쓴다.
 * 네 언어 번역은 마지막 단계에서 채우고, 그때 이 대체는 쓰이지 않게 된다(콘텐츠 점검이 모양 차이를 알린다).
 */
function fill(base: unknown, over: unknown): unknown {
  if (over === undefined) return base;
  if (Array.isArray(base) && Array.isArray(over)) return over.length === base.length ? over.map((v, i) => fill(base[i], v)) : base;
  if (base && over && typeof base === 'object' && typeof over === 'object') {
    const o = over as Record<string, unknown>;
    return Object.fromEntries(Object.entries(base as Record<string, unknown>).map(([k, v]) => [k, fill(v, o[k])]));
  }
  return over;
}

export function getHome(lang: Lang): HomeContent {
  const ko = load('ko');
  return (lang === 'ko' ? ko : fill(ko, load(lang))) as unknown as HomeContent;
}

export function getUi(lang: Lang): UiText {
  const mod = uiFiles[`../content/ui/${lang}.json`];
  if (!mod) throw new Error(`UI 문구 없음: ${lang}`);
  return mod.default;
}
