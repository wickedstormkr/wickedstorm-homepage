import type { APIRoute } from 'astro';
import { notificationSvg } from '../../lib/story-svg';
export const GET: APIRoute = () => new Response(notificationSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
