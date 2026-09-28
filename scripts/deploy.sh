#!/usr/bin/env bash
# 운영 배포: https://wickedstorm.kr (AWS S3 정적 웹사이트 + CloudFront). 규칙은 CLAUDE.md '운영 배포'.
# - origin/main과 같은 깨끗한 커밋만 올린다. GA4는 운영 빌드에서만 켠다(site.config.mjs).
# - 지우지 않고 덮어쓴다(--delete 금지): 버킷의 fair2026/(박람회 자료 PDF, 자료 받기 링크)를 남긴다.
# - 캐시: 해시가 붙은 파일은 1년, 그 밖의 자산은 하루, HTML · xml · txt는 매번 확인(no-cache).
#   자산을 먼저, HTML을 마지막에 올린다(새 HTML이 아직 없는 파일을 가리키는 순간이 없게).
# - 버킷과 CloudFront 배포는 도메인으로 찾는다(공개 저장소에 인프라 식별자를 두지 않는다).
# 사용: AWS_PROFILE=<배포 권한 프로필> npm run deploy · DRY_RUN=1이면 올릴 목록만 보이고 캐시는 비우지 않는다
set -euo pipefail

DOMAIN=wickedstorm.kr
GA_ID=G-0Y5QD1HBGN
cd "$(dirname "$0")/.."

git fetch -q origin main
if [ -n "$(git status --porcelain)" ]; then
  echo "커밋되지 않은 변경이 있습니다. 운영에는 origin/main만 올립니다." >&2
  exit 1
fi
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "지금 커밋($(git rev-parse --short HEAD))이 origin/main과 다릅니다. main을 받은 뒤 올립니다." >&2
  exit 1
fi

DIST_ID=$(aws cloudfront list-distributions --output text \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$DOMAIN')].Id | [0]")
ORIGIN_ID=$(aws cloudfront get-distribution-config --id "$DIST_ID" --output text \
  --query "DistributionConfig.DefaultCacheBehavior.TargetOriginId")
ORIGIN=$(aws cloudfront get-distribution-config --id "$DIST_ID" --output text \
  --query "DistributionConfig.Origins.Items[?Id=='$ORIGIN_ID'].DomainName | [0]")
BUCKET=${ORIGIN%%.s3-website*}
case "$ORIGIN" in
  *.s3-website*) ;;
  *) echo "$DOMAIN의 CloudFront 기본 원본이 S3 웹사이트가 아닙니다: $ORIGIN" >&2; exit 1 ;;
esac
echo "배포 대상: s3://$BUCKET (CloudFront $DIST_ID) · 커밋 $(git rev-parse --short HEAD)"

rm -rf dist
PUBLIC_GA_ID=$GA_ID npm run build

if [ "${DRY_RUN:-}" = 1 ]; then MODE=--dryrun; else MODE=--only-show-errors; fi
put() { aws s3 sync dist/ "s3://$BUCKET/" $MODE "$@"; }
put --exclude "*" --include "_astro/*" --include "fonts/*.woff2" --include "fonts/*.css" \
  --cache-control "public,max-age=31536000,immutable"
put --exclude "*.html" --exclude "*.xml" --exclude "*.txt" \
  --exclude "_astro/*" --exclude "fonts/*.woff2" --exclude "fonts/*.css" \
  --cache-control "public,max-age=86400"
put --exclude "*" --include "*.xml" --include "*.txt" --cache-control "no-cache"
put --exclude "*" --include "*.html" --cache-control "no-cache" --content-type "text/html; charset=utf-8"

if [ "$MODE" = --dryrun ]; then
  echo "DRY_RUN: 올리지 않았고 캐시도 비우지 않았습니다."
  exit 0
fi
echo "캐시 비우기: $(aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*' --query 'Invalidation.Id' --output text)"
echo "완료: https://$DOMAIN"
