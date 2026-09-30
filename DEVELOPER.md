# 개발자 안내

위키드스톰 홈페이지(https://wickedstorm.kr)를 고치고 점검하고 배포하는 방법입니다.

- 비개발자용 요약: [`README.md`](README.md)
- 규칙의 기준(디자인 원칙, 문구, 색, 줄바꿈, 사실): [`CLAUDE.md`](CLAUDE.md). 사람과 AI 에이전트가 함께 따릅니다. 이 문서와 다르면 CLAUDE.md가 우선입니다.

## 목차
- [한눈에](#한눈에)
- [시작하기](#시작하기)
- [주소와 페이지](#주소와-페이지)
- [구조](#구조)
- [콘텐츠 수정](#콘텐츠-수정)
- [문의 폼과 방문 통계](#문의-폼과-방문-통계)
- [점검](#점검)
- [작업 흐름](#작업-흐름)
- [운영 배포](#운영-배포)
- [개인정보처리방침 고치기](#개인정보처리방침-고치기)
- [움직임 · 접근성 · 글꼴 · 줄바꿈](#움직임--접근성--글꼴--줄바꿈)
- [문서](#문서)
- [남은 일](#남은-일)
- [진행 이력](#진행-이력)

## 한눈에

| 항목 | 내용 |
|---|---|
| 만든 방식 | Astro 정적 사이트 + TypeScript(strict). 서버가 필요한 곳은 문의 폼 하나(AWS Lambda) |
| 언어 | `/`(한국어) · `/en/` · `/ja/` · `/vi/`. 국문이 기준 |
| 운영 | https://wickedstorm.kr : AWS S3 정적 웹사이트 + CloudFront. `npm run deploy`로 올림 |
| 미리보기 | https://wickedstormkr.github.io/wickedstorm-homepage/ : main에 병합하면 자동 갱신(`.github/workflows/preview.yml`), 검색 제외 |
| 연출 | 오프닝 여섯 장면. 데이터 아트 3층(OGL WebGL2 → 캔버스 → 미리 그린 SVG), GSAP · Lenis는 데스크톱 보강용 |
| 점검 | PR마다 CI: 타입, 콘텐츠 규칙, 깨진 링크, Playwright(반응형 · axe · 동작 · 글꼴), Lighthouse |
| 인프라 | CodeCommit `wickedstorm-infra`: 문의 Lambda(SAM), CloudFront · S3 · DNS(Terraform) |

## 시작하기

Node 22.12 이상.

```bash
npm install
npm run dev        # http://localhost:4321 (개발 서버. 글꼴은 다이나믹 서브셋 그대로)
npm run build      # dist/ 정적 사이트 + 글꼴 서브셋(scripts/fonts/subset.mjs)
npm run preview    # dist/ 미리 보기
```

사이트 주소와 GA는 [`site.config.mjs`](site.config.mjs) 한 곳에서 정하고, 환경 변수로 덮어씁니다.

```bash
npm run build                                                                             # 운영 주소(https://wickedstorm.kr, base /), GA 끔
SITE_URL=https://wickedstormkr.github.io BASE_PATH=/wickedstorm-homepage/ npm run build   # GitHub Pages 미리보기
PUBLIC_GA_ID=G-0Y5QD1HBGN npm run build                                                   # GA4 켬(운영 배포에서만. deploy.sh가 켬)
```

- 사이트 안 주소는 모두 `src/lib/url.ts`의 `url()`을 거쳐 base가 붙습니다. 콘텐츠 파일 안 주소는 사이트 루트 기준(`/privacy.html`)으로 적습니다.
- 미리보기 · CI 빌드는 GA를 싣지 않습니다. 운영 통계를 더럽히지 않고, 첫 로드 JS 예산도 우리 코드만으로 잽니다.

## 주소와 페이지

| 페이지 | 국문 주소 | 다른 언어 | 파일 |
|---|---|---|---|
| 홈 | `/` | `/en/index.html` 등 | `src/pages/index.astro`, `[lang]/index.astro` → `components/HomePage.astro` |
| 에듀테크 | `/edutech.html` | `/en/edutech.html` 등 | `views/EdutechPage.astro` |
| 신뢰(인증 · 특허 원본) | `/trust.html` | 〃 | `views/TrustPage.astro` |
| 회사소개 | `/company.html` | 〃 | `views/CompanyPage.astro` |
| 도입 문의 | `/contact.html` | 〃 | `views/ContactPage.astro` |
| 뉴스룸 | `/news.html`, `/news/<id>.html` | `/en/news.html`, `/en/news/<id>.html` 등 | `views/NewsListPage.astro`, `views/ArticlePage.astro` |
| 제품(숨김) | `/product.html` | 〃 | `views/ProductPage.astro` |
| 사례(숨김) | `/cases.html` | 〃 | `views/CasesPage.astro` |
| 개인정보처리방침 | `/privacy.html` | 국문만 | `pages/privacy.astro` |
| 링크 모음(인스타그램 프로필용) | `/links.html` | 국문만 | `pages/links.astro` |
| 404 · sitemap · robots | `/404.html`, `/sitemap.xml`, `/robots.txt` | | `pages/` |

- 하위 페이지 목록은 `src/lib/i18n.ts`의 `PAGES`, 숨긴 페이지는 `HIDDEN_PAGES`(메뉴 · 푸터 · 홈의 '자세히 보기' · 사이트맵에서 빠지고 noindex. 주소와 홈 섹션은 남음).
- 솔루션 사이트(lecognizer.ai · learnhubble.ai) 링크는 `src/config/client.ts`의 `SHOW_SOLUTION_SITES`로 숨겨 두었습니다.
- 밖에서 홈(`/`)으로 들어오면 운영 CloudFront 함수가 그 언어 홈으로 보냅니다(302, 쿼리 유지. 코드는 인프라 저장소). 브라우저 첫 언어가 한국어 · 일본어 · 베트남어면 그 언어, 아니면 접속 국가로 한국은 그대로, 일본 `/ja/`, 베트남 `/vi/`, 그 밖은 `/en/`. 홈이 아닌 주소, 사이트 안에서 온 이동, 검색 · 미리보기 로봇은 보내지 않습니다. 로컬 · 미리보기(GitHub Pages)에는 이 함수가 없습니다.
- 그 밖에는 브라우저 첫 언어가 페이지와 다르면 그 언어로 안내 띠만 띄웁니다.

## 구조

```
site.config.mjs              사이트 주소(site · base), GA 측정 ID
astro.config.mjs             Astro 설정
src/config/client.ts         브라우저 설정: 문의 서버 주소(CONTACT_API), 솔루션 사이트 링크, 인스타그램 · 블로그(SOCIAL)
src/content/home/<lang>/     홈 섹션과 하위 페이지 문구(JSON): common, hero, story, product, learnhubble, standards,
                             cases, news, resources, company, contact, edutech, trust
src/content/ui/<lang>.json   화면 부품 문구(메뉴, 움직임 멈춤, 언어 안내 띠, 문의 폼 메시지, 404)
src/content/posts/           소식: posts.json(국문 원문) + i18n/<lang>.json(번역)
src/content.config.ts        소식 컬렉션과 필드 규칙
src/assets/img/              화면 이미지(빌드 때 AVIF · WebP · srcset). news/는 소식 사진
src/assets/media/            기업영상 포스터
public/                      주소가 고정돼야 하는 파일: 파비콘, files/(카탈로그 · 회사소개서 PDF), media/(기업영상),
                             img/, fonts/(개발 서버용 글꼴 CSS, Sora)
fonts-src/                   Pretendard Variable 원본(OFL). 빌드 때 쓰인 글자만 잘라 씀
src/layouts/                 Base(head · 메타 · hreflang · 헤더 · 푸터 · 공통 스크립트), Page(하위 페이지 틀)
src/pages/                   주소(라우트). [lang]/은 다른 언어, art/은 기본 층 SVG
src/views/                   하위 페이지 본문(에듀테크 · 신뢰 · 회사 · 문의 · 제품 · 사례 · 소식 목록 · 기사)
src/sections/                홈 섹션: Story(오프닝 여섯 장면), Product, LearnHubble, Standards, Cases, News,
                             Company, Contact, Resources
src/components/              헤더, 푸터, 언어 선택, 움직임 멈춤, 안내 띠, 이미지, 소식 카드, 표준 지도 등
src/components/fragments/    HTML로 다시 그린 제품 화면 조각(운영자 · 이상 탐지 · 교수자 · 학습자)
src/lib/                     i18n, url, content(문구 불러오기), posts, article(본문 정리), images,
                             phrase(일본어 BudouX), sents(문장 단위 줄바꿈), typeset(마지막 줄 한 단어 방지),
                             story-data · story-ledger · story-svg(데이터 아트 모델과 기본 층 그림)
src/middleware.ts            모든 HTML에 조판(typeset) 적용
src/scripts/                 site(헤더 · 메뉴 · 안내 띠 · 연혁), motion(움직임 허용 여부), contact-form, attribution(유입 기록)
src/scripts/story/           boot(첫 로드: 장면 전환 · 키보드), layout(공통 장면 진행값), enhance(데스크톱 보강),
                             webgl-art(OGL) · canvas-art(2D), ledger · live(수집 창 · 기록 행)
src/styles/                  tokens(디자인 토큰 한 파일), base, chrome, home, story, cards, pages, fragments, article
scripts/deploy.sh            운영 배포
scripts/capture.mjs          PR용 화면 캡처(홈)
scripts/fonts/subset.mjs     빌드 뒤 글꼴 서브셋
scripts/checks/              콘텐츠 규칙(content), 깨진 링크(links), 결과표(report)
scripts/migrate/             처음 옮길 때 쓴 스크립트(보관용, 아래 참고)
tests/                       Playwright 점검. pages.ts가 점검할 페이지 · 폭 목록
docs/                        설계 · 조사 · 번역 · 마케팅 문서(아래 '문서')
```

## 콘텐츠 수정

### 홈과 하위 페이지 문구
`src/content/home/<lang>/<파일>.json`을 고칩니다. 국문(`ko`)이 기준이고, 네 언어 파일의 모양(키와 배열 길이)이 같아야 합니다(`npm run test:content`가 확인).

- 문구 안에 쓸 수 있는 태그: `<span class="g">`(브랜드 그라디언트 글자), `<br class="br-d">`(1280px 이상에서만 줄바꿈), `<br class="br-t">`(700px 이상), `<span class="nw">`(끊지 않는 말), `<b>`. 언제 무엇을 쓰는지는 CLAUDE.md '줄바꿈과 다국어'.
- 용어는 카탈로그 다국어판 기준입니다: `docs/i18n/*_terms.md`.
- 긴 줄표(—), '(개발 중)', GROWA · LXP를 제품명처럼 쓰기, 청록색, 히어로의 '240만'은 점검에서 걸립니다.
- 화면 부품 문구(버튼 이름, 폼 오류 메시지 등)는 `src/content/ui/<lang>.json`.

### 소식
`src/content/posts/posts.json`에 국문 글을 넣고, `src/content/posts/i18n/<lang>.json`에 번역을 넣습니다.

- posts.json은 옛 관리 화면(homepage_renewal `admin.html`)이 읽고 쓰던 모양 그대로입니다(`{version, updated, posts:[…]}`). 모양을 바꾸지 않습니다.
- 필드(`src/content.config.ts`): `id`(영문 소문자 · 숫자 · 하이픈, 주소가 됨), `category`(news · story · insight), `date`(YYYY.MM.DD), `title`, `summary`, `body`(HTML), `thumb`(`./img/...` 또는 null), `externalUrl`(바깥 기사면 주소, 아니면 null), `pinned`(홈 '최근 소식'에 고정).
- 번역: `i18n/<lang>.json` = `{ "<글 id>": { title, summary, alt, body } }`. 국문 `ko.json`에는 썸네일 대체 글(`alt`)만 둡니다. 번역이 없으면 그 언어 페이지에도 국문이 보이고(`lang="ko"`와 안내), `test:content`가 알림을 띄웁니다. 번역 본문의 태그 차례 · 링크 · 그림 주소는 국문과 같아야 합니다.
- 본문 HTML은 허용 목록만 살립니다: p, strong, em, b, i, ul, ol, li, h2, h3, blockquote, figure, figcaption, br, http(s) 링크, `./img/` 이미지.
- 이미지는 `src/assets/img/news/`에 넣고 본문에서 `./img/파일이름`으로 부릅니다. 없는 이름이면 빌드가 멈춥니다.
- 빌드하면 네 언어의 소식 목록 · 기사 · 홈 '최근 소식' · 사이트맵이 함께 갱신됩니다.

### 이미지 · PDF · 영상
- 화면 이미지: `src/assets/img/`. 콘텐츠 파일에는 파일 이름만 적습니다(`"img": "lh-portfolio.webp"`).
- 홈 '자료 받기'의 카탈로그 · 회사소개서는 버킷의 `fair2026/docs/`(박람회 QR과 같은 파일, 저장소 밖)를 가리킵니다. `public/files/`의 PDF는 링크 모음 등 사이트 안 링크용입니다.
- 기업영상: `public/media/`.

### 설정
- 문의 서버 · 솔루션 사이트 링크 · 인스타그램 · 블로그: [`src/config/client.ts`](src/config/client.ts). `SOCIAL`을 채우면 홈 채널 띠와 푸터 링크가 나타납니다(비어 있으면 숨김).
- 사이트 주소 · GA: [`site.config.mjs`](site.config.mjs).
- 채용 링크: `src/content/home/<lang>/common.json`의 `nav.recruitHref`(네 언어 같은 주소).

## 문의 폼과 방문 통계

```
문의 폼 → https://wickedstorm.kr/api/contact (CloudFront가 접속 국가를 붙임)
       → 문의 Lambda: 대기열에 넣고 바로 200 "Inquiry received"(약 1초)
       → 대기열 처리: 문의 관리표(구글 시트) 기록 → SES 알림 메일(manager@, 담당자 참조)
       → 실패하면 다시 시도. 계속 실패하면 실패 대기열 → 경보 → manager@로 경고 메일
```

- 서버 코드와 인프라는 CodeCommit `wickedstorm-infra`(SAM `homepage-call-smtp`)에 있습니다. 이 저장소에서는 고치지 않습니다.
- **보내는 값의 이름(서버 계약)은 바꾸지 않습니다.** `tests/behavior.spec.ts`가 보내는 값을 확인합니다(실제 전송은 가로챔). 문의 목적 · 유입 기록 · 접수 번호는 제목(`subject`)과 본문(`inquiry`) 끝 '접수 정보'로 싣습니다.
- 유입 기록(`src/scripts/attribution.ts`)은 브라우저 저장소에 둡니다: 처음 방문 6개월, 최근 유입 90일, 문의 버튼 위치 30분 안의 것만 씁니다.
- GA4 이벤트: 양식을 쓰기 시작하면 `contact_start`, 접수되면 `generate_lead`(접수 번호 `lead_id`, 목적, 들어온 곳, 언어, 유입 경로). 이름 · 이메일 · 소속 · 문의 글은 보내지 않습니다.
  - `lead_id`는 관리표와 맞추면 문의자와 이어지므로 개인정보처리방침 1 · 2 · 6항에 적었습니다. **GA4로 보내는 값을 바꾸면 방침도 함께 고칩니다**(아래 '개인정보처리방침 고치기').
  - 사무실 IP는 GA4 내부 트래픽 필터로 빠집니다. 운영에서 이벤트를 확인하려면 휴대폰 데이터로 보내거나, 브라우저 개발자 도구에서 `google-analytics.com/g/collect` 요청의 `en=`을 봅니다.
- **시험 문의**: 이메일 `homepage-test@example.com`, 본문에 `CONTACT-QA-`(관리표에서 시험 행으로 구분).
- UTM 규칙과 GA4 보는 법: [`docs/marketing/analytics.md`](docs/marketing/analytics.md).

## 점검

```bash
npm run check                # 타입 검사(astro check, TypeScript strict)
npm run build                # 아래 점검은 dist/ 기준이라 먼저 빌드
npm test                     # 콘텐츠 규칙 + 깨진 링크 + 브라우저 테스트
npm run test:content         # 네 언어 모양, 긴 줄표, '개발 중', GROWA · LXP, 청록, 히어로 240만, 소식 번역
npm run test:links           # 사이트 안 링크 · 이미지 · srcset · #앵커 (test:links:external은 바깥 링크, 경고만)
npm run test:e2e             # Playwright 전체
npm run test:lh              # Lighthouse CI(폰 예산). 로컬은 CHROME_PATH가 필요할 수 있음
npm run report               # 결과를 한 장의 표로(test-results/report.md)
```

| 파일 | 보는 것 |
|---|---|
| `tests/responsive.spec.ts` | 폭 360 · 390 · 430 · 768 · 820 · 1024 · 1280 · 1440 · 1920 × 모든 페이지(네 언어): 가로 넘침, 칸 밖 글자, 11px 미만 글자, 터치 폭(≤1023)의 본문 15px · 누르는 곳 44px, 마지막 줄 한 단어 |
| `tests/a11y.spec.ts` | axe, WCAG 2.2 AA 규칙 묶음(KWCAG 2.2 대응). 모든 페이지 × 390 · 1280 |
| `tests/behavior.spec.ts` | 움직임 멈춤, 오프닝 이야기 조작 · 키보드, 맨 위로, 언어 안내 띠, 모바일 메뉴, 문의 폼(서버 계약 · 목적 · 유입 기록 · GA4 이벤트) |
| `tests/story.spec.ts` | 오프닝 여섯 장면이 네 언어 × 폰 · 태블릿 · 데스크톱에서 읽히는지 |
| `tests/hero-refinements.spec.ts` | 첫 화면 · 주요 제목의 줄 수와 짜임, 좁은 기록 행 · 알림 줄이 모든 언어에서 읽히는지 |
| `tests/glyphs.spec.ts` | 모든 글자가 사이트 글꼴로 그려지는지(시스템 글꼴로 떨어지면 기기마다 줄바꿈이 달라짐) |

- **Lighthouse**(`lighthouserc.cjs`): 폰 에뮬레이션, 5회 중앙값. 예산 LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms(INP 대신), 첫 로드 JS ≤ 90KB(gzip). 폰과 같은 조건이 되게 CI에 한글 · 일본어 시스템 글꼴을 설치합니다.
- **CI**(`.github/workflows/ci.yml`): PR과 main push마다 위 점검을 모두 돌리고, 결과표를 작업 요약과 PR 댓글(한 개를 계속 갱신)에 남깁니다. 약 10분.
- 로컬 Playwright: 처음 한 번 `npx playwright install chromium`. 테스트는 `dist/`를 `astro preview`로 띄워 봅니다(기본 포트 4321). 개발 서버가 4321에 떠 있으면 그 서버를 재사용해 결과가 달라지니 `PORT=4400 npx playwright test …`처럼 다른 포트를 씁니다. 한 파일 · 한 페이지만: `PORT=4400 npx playwright test tests/a11y.spec.ts --grep privacy`.

## 작업 흐름

1. 기능 단위 브랜치를 만들고 `main` 대상 PR을 냅니다. **병합은 사람이 정합니다.**
2. 한 커밋에는 한 가지 일만 담습니다(부분 되돌리기가 쉽게).
3. 화면을 바꾸면 폰 · 태블릿 · 데스크톱 캡처를 PR에 붙입니다(`npm run build && npm run capture -- <폴더>`, 홈 기준. 다른 페이지는 Playwright로 직접).
4. 지적받은 한 곳만 고치지 말고, 같은 원인을 전체에서 찾아 고칩니다.
5. CI가 통과하고 리뷰(큰 변경은 `/code-review ultra`)를 거친 뒤 병합합니다. 병합하면 미리보기가 자동으로 갱신됩니다.
6. 운영에는 아래 '운영 배포'로 올립니다. **병합만으로는 운영에 나가지 않습니다.**

## 운영 배포

```bash
git switch main && git pull
AWS_PROFILE=<배포 권한 프로필> DRY_RUN=1 npm run deploy   # 올릴 목록만 확인(캐시는 비우지 않음)
AWS_PROFILE=<배포 권한 프로필> npm run deploy             # 빌드(GA4 켬) → S3 업로드 → CloudFront 캐시 비우기
```

`scripts/deploy.sh`가 하는 일:
- origin/main과 같은 깨끗한 커밋에서만 올립니다(변경이 남아 있거나 커밋이 다르면 멈춤).
- 버킷과 CloudFront 배포는 도메인으로 찾습니다. 공개 저장소라 인프라 식별자를 코드에 두지 않습니다.
- 자산을 먼저, HTML을 마지막에 올립니다. 새 HTML이 아직 없는 파일을 가리키는 순간이 없게 하려는 것입니다.
- 캐시: 해시가 붙은 파일(`_astro/`, 글꼴)은 1년, 그 밖의 자산은 하루, HTML · xml · txt는 매번 확인(no-cache).
- **지우지 않고 덮어씁니다(`--delete` 금지).** 버킷의 `fair2026/`(박람회 자료 PDF, '자료 받기' 링크)가 저장소 밖에 있기 때문입니다.
- 새로 빌드하면 파일 시각이 모두 바뀌어 `s3 sync`가 거의 모든 파일을 다시 올립니다. 정상입니다.

그 밖에:
- `www.wickedstorm.kr` · `wickedstorm.co.kr` · `www.wickedstorm.co.kr`은 CloudFront 함수가 https://wickedstorm.kr 로 301 이동시킵니다(경로 · 쿼리 유지). 없는 주소는 `404.html`.
- 9.28 전 한 장짜리 사이트를 버킷에 풀던 CodePipeline은 배포 단계를 막아 두었습니다. 다시 켜지 않습니다.
- 배포 뒤 확인: 바뀐 페이지를 운영 주소에서 열어 보고, 문의 쪽을 바꿨다면 시험 문의를 한 건 보냅니다.
- **AWS 쪽(문의 Lambda, CloudFront, S3, DNS)은 콘솔에서 바꾸지 않습니다.** `wickedstorm-infra`에서 코드로 고치고 검증한 뒤 PR을 올리면, 인프라 담당이 적용합니다(그 저장소의 AGENTS.md와 팀 인프라 가이드).

## 개인정보처리방침 고치기

- 파일: `src/pages/privacy.astro`. 시행일은 맨 위 상수 `EFFECTIVE` 하나로, 시행일 줄과 13항에 함께 쓰입니다.
- 시행일은 운영에 게시(배포)한 날보다 앞서지 않게 적습니다.
- **개정은 시행 7일 전부터 공지합니다**(13항). 13항에 개정일 · 바뀐 내용을 이력으로 더합니다.
- 수집 항목, 보관 기간, 위탁 업체, 국외 이전, GA4로 보내는 값, 브라우저 저장소 사용이 바뀌면 방침도 같은 PR에서 고칩니다.
- 이력: 9.28 공식 홈페이지에 처음 게시(당시 시행 예정 10.13) → 9.29 개정 · 시행. 9.28 전 공식 도메인에는 방침이 없었고, 리뉴얼 초안의 '7월 15일'은 미리보기 초안의 공개 예정일이라 이력에 넣지 않습니다.
- 캡처: `docs/marketing/shots/privacy-ko@{390,820,1440}.jpg`.

## 움직임 · 접근성 · 글꼴 · 줄바꿈

자세한 규칙은 CLAUDE.md '원칙' · '기술' · '줄바꿈과 다국어'에 있습니다. 코드에서 찾을 곳만 적습니다.

- **움직임 멈춤**: 오프닝 이야기 조작 안의 버튼이 반복 애니메이션을 모두 멈춥니다(KWCAG 6.2.2). 선택은 브라우저에 기억되고, '동작 줄이기' 설정이면 멈춘 상태로 시작합니다. 움직이는 코드는 `src/scripts/motion.ts`의 `motionAllowed()` · `onMotionChange()`를 따릅니다.
- **오프닝**: 장면 진행값은 `src/scripts/story/layout.ts` 하나를 글 · 캔버스 · WebGL이 함께 씁니다. 맨 아래 층(미리 그린 SVG, `src/pages/art/`)만으로도 이야기가 완결되어야 합니다. WebGL은 첫 화면이 뜬 뒤, 성능이 되는 기기에서만 불러옵니다.
- **글꼴**: Pretendard(한글 · 라틴 · 베트남어), Pretendard JP(가나 · 한자, npm `pretendard-jp`), Sora(영문 표시, `public/fonts/`), JetBrains Mono(코드 · 시각, npm). 빌드가 언어별로 쓰인 글자만 잘라 싣고, 글꼴에 없는 글자가 나오면 빌드를 멈춥니다. 대체 글꼴은 글자 폭을 맞춰 두어 화면 밀림(CLS)을 줄입니다(`src/styles/base.css`).
- **줄바꿈**: 마지막 줄 한 단어 방지 `src/lib/typeset.ts`(모든 HTML에 `middleware.ts`로 적용), 일본어 구 단위 `src/lib/phrase.ts`(BudouX), 문장 단위 `src/lib/sents.ts`.

## 문서

| 위치 | 내용 |
|---|---|
| `docs/redesign/analysis/index.html` | 재구축안(설계 기준). 브라우저로 엽니다 |
| `docs/redesign/research.md` · `unified-hero.md` | 레퍼런스 조사, 첫 화면 통합 기록 |
| `docs/source/` | 제품 화면 원본(화면 속 인물 · 교과 · 수치는 모두 시연용) |
| `docs/i18n/` | 네 언어 용어표(`*_terms.md`)와 번역 노트(`*_notes.md`, 공개 전 기준이라 갱신 필요) |
| `docs/marketing/` | GA4 · UTM · 문의 분석(`analytics.md`)과 캡처 |
| `docs/tasks/`, `docs/phase-1/`, `docs/phase-2/` | 초기 단계의 작업 지시와 PR 기록(보관용) |

### 옮기기 스크립트(보관용)
`scripts/migrate/`는 7월 리뉴얼 초안(`wickedstormkr/homepage_renewal`)에서 문구 · 자산을 처음 옮길 때 쓴 스크립트입니다. 그 뒤로 이 저장소의 문구가 많이 바뀌어, 다시 돌리면 지금 내용을 덮어씁니다. 쓰지 않습니다.

## 남은 일

1. **채용 공고 연결**: '채용' 링크(헤더 · 푸터 · 모바일 메뉴 · 홈 채용 줄 · 회사 페이지)는 모두 사람인의 회사 채용 페이지로 갑니다(`common.json`의 `nav.recruitHref`). 공고가 정해지면 실제 공고로 잇고, 채용 안내 글(`company.json`의 `careers`)도 맞춥니다.
2. **해외 워크숍 소식 글**: `posts.json`과 네 언어 번역, 사진은 `src/assets/img/news/`.
3. **번역 원어민 검토**: 영어 메뉴 이름(Trust · Newsroom · About us)과 좁은 칸에 맞춰 줄인 문구(신뢰 목차), 베트남어 'Đồng sáng lập 1EdTech Korea', 일본어 'Learning Loop' 표기(`docs/i18n/ja_notes.md` 1-3). `docs/i18n/*_notes.md`도 함께 갱신합니다.
4. **소식 사진 사용 허락**: 1EdTech Korea 출범 기사 사진(전자신문), 런던 서밋 사진(한림대학교 제공).
5. **인스타그램 · 블로그 주소**: `src/config/client.ts`의 `SOCIAL`.
6. **문서 정리**: `docs/marketing/analytics.md` '7. 개인정보'의 "유입 기록은 문의를 보낼 때만 메일에 함께 실려 회사로 옵니다"가 방침 3 · 6 · 7항(문의 관리표, 문의 전 GA4로 가는 문의 버튼 위치)과 맞지 않습니다.
7. **배포 안전장치(선택)**: `deploy.sh`에서 방침 시행일이 배포일보다 이르면 멈추게 하기.

## 진행 이력

| 시기 | 내용 | PR |
|---|---|---|
| 9.25 | 1단계 기반(Astro 뼈대 · 디자인 토큰 · 네 언어 · 자동 점검), 공개 일정을 하노이 VIETEDU 전으로 앞당김, 2단계 오프닝 여섯 장면 | #1~#3 |
| 9.25~9.27 | 하위 페이지, 하위 페이지 · 소식 네 언어, 문의 목적 · 유입 기록과 GA4, 첫 화면 반응형 · 공통 타이포그래피, 모든 글자를 사이트 글꼴로 | #4~#12 |
| 9.28 | 자료 받기 PDF, 문의 접속 국가 기록, 첫 화면 · 에듀테크 · 메뉴 정리, **운영 공개(S3 + CloudFront)** | #13~#16 |
| 9.29 | 개인정보처리방침 개정(문의 관리표 · 접속 기록 · 회사 메일, 첫 게시 · 개정 이력), GA4 문의 이벤트가 운영에서 나가지 않던 문제 수정 | #17~#19 |

다음 목표는 하노이 VIETEDU(10.15~18)입니다. 부스 QR은 베트남어 홈(`/vi/`)으로 연결합니다.
