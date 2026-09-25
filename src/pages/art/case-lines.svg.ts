import type { APIRoute } from 'astro';
import { linesSvg } from '../../lib/story-svg';
export const GET: APIRoute = () => new Response(linesSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
