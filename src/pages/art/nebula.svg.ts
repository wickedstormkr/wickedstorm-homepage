import type { APIRoute } from 'astro';
import { nebulaSvg } from '../../lib/story-svg';
export const GET: APIRoute = () => new Response(nebulaSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
