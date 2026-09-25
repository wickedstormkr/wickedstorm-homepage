import type { APIRoute } from 'astro';
import { galaxySvg } from '../../lib/story-svg';
export const GET: APIRoute = () => new Response(galaxySvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
