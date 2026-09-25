import type { APIRoute } from 'astro';
import { ringSvg } from '../../lib/story-svg';
export const GET: APIRoute = () => new Response(ringSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
