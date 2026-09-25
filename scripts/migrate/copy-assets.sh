#!/usr/bin/env bash
# 지금 사이트(homepage_renewal)에서 새 구조로 자산을 옮긴다. 이전용(다시 실행하면 덮어쓴다).
#   bash scripts/migrate/copy-assets.sh <homepage_renewal 경로>
# - src/assets/img : Astro 자산 처리(AVIF·WebP, srcset)를 거치는 이미지. 쓰는 것만 옮긴다.
# - public/        : 주소가 그대로 유지돼야 하는 파일(파비콘, OG 이미지, 로고 SVG, PDF, 영상, 글꼴).
set -euo pipefail
SRC="${1:?homepage_renewal 경로}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

mkdir -p src/assets/img/news src/assets/media public/img public/files public/media public/fonts/pretendard docs/i18n src/content/posts

# 화면 이미지(홈·소식에서 쓰는 것만)
for f in dash-main-public feed-img01 feed-img02 learning-loop lecognizer-ai-detect \
         lh-assignment lh-casemap lh-lecture-qa lh-portfolio patent-anomaly patent-profiling \
         pipe-analyze pipe-collect pipe-store ref-logos thumb-catalog thumb-profile; do
  cp "$SRC/img/$f.webp" src/assets/img/
done
cp "$SRC"/img/news/*.webp src/assets/img/news/
cp "$SRC/media/company-film-poster.webp" src/assets/media/

# 주소 고정 파일
cp "$SRC/favicon.ico" public/
cp "$SRC/img/favicon.png" "$SRC/img/logo-white.svg" "$SRC/img/symbol.png" "$SRC/img/og-image.png" "$SRC"/img/og-home*.jpg public/img/
cp "$SRC"/files/*.pdf public/files/
cp "$SRC/media/company-film.mp4" public/media/

# 글꼴: Pretendard 다이나믹 서브셋 92청크 + 베트남어 보강 청크, Sora
cp -r "$SRC/fonts/pretendard/woff2-dynamic-subset" public/fonts/pretendard/
cp "$SRC/fonts/pretendard/PretendardVariable.vi.woff2" "$SRC/fonts/pretendard/LICENSE.txt" public/fonts/pretendard/
cp "$SRC/fonts/Sora-latin.woff2" "$SRC/fonts/Sora-OFL.txt" public/fonts/

# 소식 데이터(관리 화면과 같은 형식 그대로)
cp "$SRC/data/posts.json" src/content/posts/posts.json

# 용어표와 번역 노트
cp "$SRC"/i18n/*_terms.md "$SRC"/i18n/*_notes.md docs/i18n/
echo "자산 이전 완료"
