import { getCollection, type CollectionEntry } from 'astro:content';

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

export const postPath = (p: Post) => p.externalUrl ?? `/news/${p.id}.html`;

/** 카테고리 표시 이름(소식은 국문만 있다) */
export const CATEGORY_KO: Record<Post['category'], string> = { news: '뉴스', story: '스토리', insight: '인사이트' };
export const CATEGORY_TAG: Record<Post['category'], string> = { news: 'NEWS', story: 'STORY', insight: 'INSIGHT' };
