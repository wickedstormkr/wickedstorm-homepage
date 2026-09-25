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
import type references from '../content/home/ko/references.json';
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
  references: typeof references;
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

export function getHome(lang: Lang): HomeContent {
  const out: Record<string, unknown> = {};
  for (const [p, mod] of Object.entries(files)) {
    const m = /home\/([a-z]+)\/([a-z]+)\.json$/.exec(p);
    if (m && m[1] === lang) out[m[2]] = mod.default;
  }
  return out as unknown as HomeContent;
}

export function getUi(lang: Lang): UiText {
  const mod = uiFiles[`../content/ui/${lang}.json`];
  if (!mod) throw new Error(`UI 문구 없음: ${lang}`);
  return mod.default;
}
