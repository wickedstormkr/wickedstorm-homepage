import type { APIRoute } from 'astro';
import { treeSvg } from '../../lib/story-svg';
export const GET: APIRoute = () => new Response(treeSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
