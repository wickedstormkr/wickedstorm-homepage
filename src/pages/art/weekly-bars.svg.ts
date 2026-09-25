import type { APIRoute } from 'astro';
import { barsSvg } from '../../lib/story-svg';
export const GET: APIRoute = () => new Response(barsSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
