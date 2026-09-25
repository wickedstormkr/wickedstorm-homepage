#!/usr/bin/env node
/**
 * PR용 화면 캡처(전체 페이지, JPEG). CLAUDE.md '화면을 바꾸면 폰·태블릿·데스크톱에서 캡처해 확인하고, PR에 붙입니다.'
 *   npm run build && npm run capture -- <출력 폴더> [폭,…] [언어,…]
 *   기본: docs/shots, 390·820·1440, ko·en·vi
 * 브라우저 언어를 페이지 언어로 맞춰(안내 띠 없이), 움직임 멈춤 상태로 찍는다(파이프라인 루프가 한 장면에 멈춤).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

const [out = 'docs/shots', widths = '390,820,1440', langs = 'ko,en,vi'] = process.argv.slice(2);
const PATH = { ko: '', en: 'en/index.html', ja: 'ja/index.html', vi: 'vi/index.html' };
const LOCALE = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', vi: 'vi-VN' };
const PORT = 4399;
const BASE = (process.env.BASE_PATH || '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
mkdirSync(out, { recursive: true });

const server = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--ignore-lock'], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}${BASE}`)).ok) break; } catch { /* 기다림 */ }
  await new Promise((r) => setTimeout(r, 500));
}
const browser = await chromium.launch();
try {
  for (const lang of langs.split(',')) {
    for (const w of widths.split(',').map(Number)) {
      const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : w < 1024 ? 1180 : 900 }, locale: LOCALE[lang], reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${PORT}${BASE}${PATH[lang]}`, { waitUntil: 'networkidle' });
      // 지연 로딩 이미지를 모두 불러온 뒤 맨 위로
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
        await document.fonts.ready;
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
      const png = await page.screenshot({ fullPage: true });
      const file = `${out}/home-${lang}-${w}.jpg`;
      const meta = await sharp(png).metadata();
      // JPEG 최대 높이(65,535px) 안이고, 너무 길면 폭을 줄인다
      await sharp(png).resize({ width: meta.height > 20000 ? Math.round(w * 0.75) : w }).jpeg({ quality: 68, mozjpeg: true }).toFile(file);
      console.log(file, `${meta.width}×${meta.height}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
