/**
 * 소식: src/content/posts/posts.json (homepage_renewal data/posts.json과 같은 형식 그대로).
 * 관리 화면(admin)이 이 파일을 그대로 읽고 쓸 수 있도록 파일 모양은 바꾸지 않고, 불러올 때 posts 배열만 꺼낸다.
 */
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: file('src/content/posts/posts.json', {
    parser: (text) => (JSON.parse(text) as { posts: Array<Record<string, unknown>> }).posts,
  }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    category: z.enum(['news', 'story', 'insight']),
    date: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
    title: z.string().min(1),
    summary: z.string(),
    body: z.string(),
    thumb: z.string().nullable(),
    externalUrl: z.url().nullable(),
    pinned: z.boolean().default(false),
  }),
});

export const collections = { posts };
