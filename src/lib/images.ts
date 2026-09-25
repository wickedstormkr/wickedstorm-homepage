/**
 * src/assets/img의 이미지를 파일 이름으로 찾는다. 콘텐츠 파일은 'lh-portfolio.webp'처럼 이름만 적는다.
 * 없는 이름이면 빌드를 멈춘다(깨진 이미지가 배포되지 않게).
 */
import type { ImageMetadata } from 'astro';

const all = import.meta.glob<{ default: ImageMetadata }>('../assets/img/**/*.{webp,png,jpg,jpeg}', { eager: true });
const byName = new Map<string, ImageMetadata>();
for (const [p, mod] of Object.entries(all)) {
  byName.set(p.replace(/^.*\/assets\/img\//, ''), mod.default);
}

export function img(name: string): ImageMetadata {
  const key = name.replace(/^(\.\.?\/)*(img\/)?/, '');
  const m = byName.get(key);
  if (!m) throw new Error(`이미지를 찾을 수 없음: ${name} (src/assets/img/${key})`);
  return m;
}

export const hasImg = (name: string) => byName.has(name.replace(/^(\.\.?\/)*(img\/)?/, ''));
