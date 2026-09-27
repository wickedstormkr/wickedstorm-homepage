import { getCollection, type CollectionEntry } from 'astro:content';
import { articlePath, type Lang } from './i18n';

export type Post = CollectionEntry<'posts'>['data'];

const key = (p: Post) => p.date.replace(/\D/g, '');

/** 날짜 내림차순 전체 */
export async function allPosts(): Promise<Post[]> {
  const list = (await getCollection('posts')).map((e) => e.data);
  return list.sort((a, b) => key(b).localeCompare(key(a)));
}

/** 홈 '최근 소식' 세 장: 고정(pinned) 글을 날짜순으로, 모자라면 최신 글로 채운다(지금 사이트 board.js와 같은 규칙) */
export async function homePosts(n = 3): Promise<Post[]> {
  const list = await allPosts();
  const pinned = list.filter((p) => p.pinned);
  const rest = list.filter((p) => !p.pinned);
  return [...pinned, ...rest].slice(0, n);
}

export const postPath = (p: Post, lang: Lang = 'ko') => p.externalUrl ?? articlePath(lang, p.id);

/**
 * 소식 번역: src/content/posts/i18n/<lang>.json = { "<글 id>": { title, summary, alt, body } }.
 * posts.json은 관리 화면이 그대로 읽고 쓰는 파일이라 모양을 바꾸지 않고, 번역은 옆 파일에 둔다.
 * 국문 파일(ko.json)에는 썸네일 대체 글(alt)만 둔다(없으면 제목).
 * 번역이 없는 글(관리 화면에서 새로 올린 글)은 국문을 그대로 쓰고 contentLang을 'ko'로 둔다(화면에 lang="ko"와 안내).
 */
interface PostText { title?: string; summary?: string; alt?: string; body?: string }
const trFiles = import.meta.glob<{ default: Record<string, PostText> }>('../content/posts/i18n/*.json', { eager: true });
const translations = (lang: Lang) => trFiles[`../content/posts/i18n/${lang}.json`]?.default ?? {};

export type LocalPost = Post & { alt: string; contentLang: Lang };
export function localPost(p: Post, lang: Lang): LocalPost {
  const t = translations(lang)[p.id];
  if (lang === 'ko' || !t?.title || !t.body) return { ...p, alt: translations('ko')[p.id]?.alt || p.title, contentLang: 'ko' };
  return { ...p, title: t.title, summary: t.summary ?? '', body: t.body, alt: t.alt || t.title, contentLang: lang };
}
export const CATEGORY_TAG: Record<Post['category'], string> = { news: 'NEWS', story: 'STORY', insight: 'INSIGHT' };
