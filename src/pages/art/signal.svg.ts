import type { APIRoute } from 'astro';
import { signalSvg } from '../../lib/story-svg';
export const GET: APIRoute = () => new Response(signalSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
