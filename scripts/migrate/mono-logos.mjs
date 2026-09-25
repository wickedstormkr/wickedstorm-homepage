#!/usr/bin/env node
/**
 * 레퍼런스 기관 로고 띠(ref-logos.webp): 지금 사이트 이미지에는 보라 그라디언트 배경이 박혀 있다.
 * 로고는 흰색이므로 밝기로 배경을 걷어 내 '흰 로고 + 투명 배경'으로 바꾼다. 배경은 CSS(.ref-logos)가 칠한다.
 *   node scripts/migrate/mono-logos.mjs src/assets/img/ref-logos.webp
 */
import sharp from 'sharp';
const file = process.argv[2];
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let p = 0; p < info.width * info.height; p++) {
  const mn = Math.min(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]);
  const a = Math.max(0, Math.min(1, (mn - 60) / (235 - 60)));
  out.fill(255, p * 4, p * 4 + 3);
  out[p * 4 + 3] = Math.round(a * 255);
}
const buf = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ lossless: true }).toBuffer();
await sharp(buf).toFile(file);
console.log(`흰 로고 + 투명 배경: ${file}`);
