import type { APIRoute } from 'astro';
import { ledgerSvg } from '../../lib/story-svg';
export const GET: APIRoute = () => new Response(ledgerSvg(), { headers: { 'Content-Type': 'image/svg+xml' } });
