# wickedstorm-homepage

위키드스톰 공식 홈페이지 재구축 저장소(비공개). 지금 운영 중인 사이트는 [`wickedstormkr/homepage_renewal`](https://github.com/wickedstormkr/homepage_renewal)입니다.

- 규칙과 방향: [`CLAUDE.md`](CLAUDE.md)
- 재구축안: `docs/redesign/analysis/index.html` (브라우저로 열기)
- 레퍼런스 조사: [`docs/redesign/research.md`](docs/redesign/research.md)
- 제품 화면 원본(시연용 데이터): [`docs/source/`](docs/source/)
- 단계별 작업 지시: [`docs/tasks/`](docs/tasks/)
- 네 언어 용어표·번역 노트: [`docs/i18n/`](docs/i18n/)

## 단계
하노이 VIETEDU(10.15~18) 전에 완성·공개합니다(9.25 결정). 재구축안(`docs/redesign/analysis/`)의 11월 일정을 앞당긴 것입니다.

| 단계 | 기간 | 내용 | 끝났다고 보는 기준 |
|---|---|---|---|
| 1 | 9.25 완료 | Astro 뼈대, 디자인 토큰, 네 언어, 자동 점검, 지금 사이트 내용 이전 | main 병합(PR #1) |
| 2 | 9.26~10.2 | 오프닝 여섯 장면: 기본 층(그림+HTML) → 폰 장면 → 데스크톱 캔버스·WebGL, 움직임 멈춤·키보드 이동 | 대표 검토 한 번 |
| 3 | 10.3~10.8 | 제품 화면 HTML 조각(핵심 네 장면), 증빙·신뢰 페이지, 표준 지도, 사례, 목적별 문의 | 네 언어 화면 점검 통과 |
| 4 | 10.9~10.11 | 일·베 원어민 검수 반영, 접근성·성능 점검, 소식 관리 연결, 도메인 전환 리허설 | 자동 점검 전부 통과 |
| 공개 | 10.12~10.13 | wickedstorm.kr 전환, 하노이 부스 QR(`/vi/`) 확인. 10.14는 예비일 | 운영 주소에서 점검 통과 |

### 다음 할 일
1. **채용 공고 연결**: 지금 '채용' 링크(헤더 · 푸터 · 모바일 메뉴 · 홈 채용 줄 · 회사 페이지)는 모두 사람인의 회사 채용 페이지로 갑니다(`src/content/home/<lang>/common.json`의 `nav.recruitHref`, 네 언어 같은 주소). 공고가 정해지면 실제 공고로 잇고, 채용 안내 글(`company.json`의 `careers`)도 맞춥니다.
2. **해외 워크숍 소식 글**: 해외 워크숍 관련 소식을 씁니다(`src/content/posts/posts.json`, 사진은 `src/assets/img/news/`. 아래 '소식' 참고). 홈 '최근 소식'에 고정하면 다른 언어 홈 카드 제목을 `src/content/home/<lang>/news.json`에 번역해 넣습니다.
3. **번역 원어민 검토**:
   - 영어 메뉴 이름(Trust · Cases)과, 좁은 칸에 맞춰 줄인 문구(첫 화면 증빙 줄, 신뢰 목차)
   - 베트남어 'Đồng sáng lập 1EdTech Korea'
   - 일본어 'Learning Loop' 표기(`docs/i18n/ja_notes.md` 1-3)
   - `docs/i18n/*_notes.md`는 예전 사이트 기준이라 함께 갱신합니다.
4. **소식 사진 사용 허락 확인**: 1EdTech Korea 출범 기사 사진(전자신문), 런던 서밋 사진(한림대학교 제공).
5. **인스타그램 · 블로그 주소**: `src/config/client.ts`의 `SOCIAL`을 채우면 홈 채널 띠와 푸터 링크가 나타납니다(지금은 비어 있어 숨김).

## 개발

Node 22.12 이상.

```bash
npm install
npm run dev        # http://localhost:4321  (개발 서버. 글꼴은 다이나믹 서브셋 그대로)
npm run build      # dist/ 정적 사이트 + 글꼴 서브셋(scripts/fonts/subset.mjs)
npm run preview    # dist/ 미리 보기
```

주소는 지금 사이트와 같습니다: `/`, `/en/index.html`, `/ja/index.html`, `/vi/index.html`, `/news.html`, `/news/<id>.html`, `/privacy.html`, `/links.html`.

### 호스팅 주소(site·base)
호스팅이 정해지지 않았으므로 [`site.config.mjs`](site.config.mjs) 한 곳에서 바꿉니다. 환경 변수로도 덮어쓸 수 있습니다.

```bash
SITE_URL=https://wickedstorm.kr BASE_PATH=/ npm run build                        # Cloudflare Pages·도메인 루트
SITE_URL=https://wickedstormkr.github.io BASE_PATH=/wickedstorm-homepage/ npm run build   # GitHub Pages 프로젝트 페이지
PUBLIC_GA_ID=G-0Y5QD1HBGN npm run build                                           # 운영 배포에서만 GA4를 켠다
```

사이트 안 주소는 모두 `src/lib/url.ts`의 `url()`을 거쳐 base가 붙습니다. 콘텐츠 파일 안 주소는 사이트 루트 기준(`/privacy.html`)으로 적습니다.

## 점검

```bash
npm run check                # 타입 검사(astro check, TypeScript strict)
npm run build                # 점검은 dist/ 기준이라 먼저 빌드
npm test                     # 콘텐츠 규칙 + 깨진 링크 + 브라우저 테스트(아래 셋)
npm run test:content         # 네 언어 모양 일치, 긴 줄표(—), '개발 중', GROWA·LXP, 청록, 히어로 240만
npm run test:links           # 사이트 안 링크·이미지·srcset·#앵커 (test:links:external은 바깥 링크, 경고만)
npm run test:e2e             # Playwright: 반응형 · axe · 동작
npm run test:lh              # Lighthouse CI(폰 예산) — 로컬은 CHROME_PATH가 필요할 수 있음
npm run report               # 결과를 한 장의 표로(test-results/report.md)
```

- **반응형**(`tests/responsive.spec.ts`, 지표는 `tests/audit/metrics.ts`): 폭 360·390·430·768·820·1024·1280·1440·1920 × 네 언어 홈, 국문 소식·기사·개인정보·링크·404.
  - 가로 넘침, 칸 밖 글자, 11px 미만 글자를 봅니다.
  - 터치 폭(≤1023)에서는 본문 15px과 누르는 곳 44px도 봅니다.
  - 마지막 줄 한 단어: 한·영·베는 단어 수, 일본어는 세 글자 이하로 판단합니다. 두 단어뿐인 이름이 한 단어씩 나뉘는 것은 문제로 보지 않습니다.
- **axe**(`tests/a11y.spec.ts`): WCAG 2.2 AA 규칙 묶음, 모든 페이지 × 390·1280.
- **동작**(`tests/behavior.spec.ts`)
  - 움직임 멈춤 버튼과 reduced-motion
  - 언어 안내 띠(자동 이동 없음), hreflang·canonical, 모바일 메뉴
  - 문의 폼: 오류 표시, UTM 유입 경로, 보내는 값이 지금 서버 계약과 같은지(실제 전송은 가로챔)
- **Lighthouse**(`lighthouserc.cjs`): 폰 에뮬레이션, 5회 중앙값.
  - 예산: LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms, 첫 로드 JS ≤ 90KB(gzip).
  - INP는 실험실에서 잴 수 없어 TBT로 대신합니다.
  - 폰과 같은 조건이 되도록 CI에는 한글 시스템 글꼴(fonts-noto-cjk)을 설치합니다.
- **CI**(`.github/workflows/ci.yml`): PR과 main push마다 위 점검을 모두 돌리고, 결과표를 작업 요약과 PR 댓글(한 개를 계속 갱신)에 남깁니다.

## 구조

```
site.config.mjs            사이트 주소(site·base), GA 측정 ID
src/config/client.ts       브라우저 설정: 문의 서버 주소(CONTACT_API), 인스타그램·블로그(SOCIAL)
src/content/home/<lang>/   홈 문구(섹션별 JSON: common, hero, story, product, learnhubble,
                           references, standards, news, resources, company, contact)
src/content/ui/<lang>.json 화면 부품 문구(메뉴 닫기, 움직임 멈춤, 언어 안내 띠, 문의 폼 메시지, 404)
src/content/posts/posts.json  소식(지금 사이트 data/posts.json과 같은 형식, 콘텐츠 컬렉션)
src/assets/img/            화면 이미지(빌드 때 AVIF·WebP·srcset)
public/                    주소가 고정돼야 하는 파일: 파비콘, OG 이미지, 로고, PDF, 기업영상, 글꼴
fonts-src/                 글꼴 원본(Pretendard Variable 1.3.9, OFL). 빌드 때 사이트 글자만 잘라 씀
src/styles/tokens.css      디자인 토큰(색·그라디언트·글꼴·크기·레이아웃) 한 파일
src/styles/                base(초기화·글자·언어별 줄바꿈), chrome(헤더·푸터), home, cards, article
src/layouts/Base.astro     head(메타·OG·hreflang·canonical), 헤더, 푸터, 공통 스크립트
src/sections/              홈 섹션. 첫 섹션은 오프닝 여섯 장면(Story.astro)
src/components/fragments/  제품 화면 조각(HTML로 다시 그린 퀴즈·xAPI 문장·이상 탐지·교수자 개입·학습자 힌트)
src/components/            헤더, 푸터, 언어 선택, 움직임 멈춤, 언어 안내 띠, 이미지, 소식 카드
src/pages/                 /, [lang]/, news, news/[id], privacy, links, 404, sitemap.xml, robots.txt
src/lib/                   i18n, url(base), content(문구 불러오기), posts, article(본문 정리), images,
                           phrase(일본어 BudouX), typeset(마지막 줄 한 단어 방지),
                           story-data(데이터 아트 모델: 입자=xAPI 문장, 자리=CASE 성취 항목, 색=활동 종류),
                           story-svg(기본 층 그림)
src/pages/art/             기본 층 그림(SVG, 빌드 때 story-data로 그림)
src/middleware.ts          모든 HTML에 조판(typeset) 적용
src/scripts/               site(헤더·메뉴·움직임·안내 띠·연혁), motion, contact-form
src/scripts/story/         boot(첫 로드: 장면 전환·키보드), enhance(데스크톱: GSAP·Lenis),
                           webgl-art(OGL) · canvas-art(2D) 데이터 아트
scripts/migrate/           지금 사이트에서 문구·자산을 옮긴 스크립트(이전용)
scripts/fonts/subset.mjs   빌드 뒤 글꼴 서브셋
scripts/checks/            콘텐츠 규칙, 깨진 링크, 결과표
tests/                     Playwright 점검
```

## 콘텐츠 수정

### 홈 문구
`src/content/home/<lang>/<section>.json`을 고칩니다. 국문(`ko`)이 기준이고, 네 언어 파일의 모양(키와 배열 길이)은 같아야 합니다(`npm run test:content`가 확인).
- 문구 안에는 지금 사이트처럼 인라인 태그를 쓸 수 있습니다: `<span class="g">`(브랜드 그라디언트 글자), `<br class="br-d">`(1280px 이상에서만 줄바꿈), `<span class="nw">`(끊지 않는 구), `<b>`.
- 용어는 카탈로그 다국어판 기준입니다: `docs/i18n/*_terms.md`. 원어민 검수 메모는 `*_notes.md`.
- 긴 줄표(—)와 '(개발 중)' 표기는 쓰지 않습니다(점검에서 걸립니다).
- 줄바꿈은 빌드가 알아서 다듬습니다.
  - 마지막 두 단어를 묶어 한 단어만 남지 않게 합니다(`src/lib/typeset.ts`).
  - 일본어 제목은 BudouX로 구 단위를 나눕니다(`src/lib/phrase.ts`).
  - 특허·전화번호는 하이픈에서 끊기지 않게 합니다.
- 화면 부품 문구(버튼 이름, 폼 오류 메시지 등)는 `src/content/ui/<lang>.json`.

### 소식
`src/content/posts/posts.json`에 글을 넣습니다. 지금 사이트 관리 화면과 같은 형식입니다(`{version, updated, posts:[…]}`).
- 필드: `id`(영문 소문자·숫자·하이픈, 주소가 됨), `category`(news·story·insight), `date`(YYYY.MM.DD), `title`, `summary`, `body`(HTML), `thumb`(`./img/...` 또는 null), `externalUrl`(바깥 기사면 주소, 아니면 null), `pinned`(홈 '최근 소식'에 고정).
- 본문 HTML은 지금 생성기와 같은 허용 목록만 살립니다: p, strong, em, b, i, ul, ol, li, h2, h3, blockquote, figure, figcaption, br, http(s) 링크, `./img/` 이미지.
- 이미지는 `src/assets/img/`(또는 `src/assets/img/news/`)에 넣고 본문에서 `./img/파일이름`으로 부릅니다. 없는 이름이면 빌드가 멈춥니다.
- 빌드하면 `/news.html` 목록, `/news/<id>.html` 상세, sitemap이 함께 갱신됩니다. 소식은 국문만 있고, 다른 언어 홈의 카드 제목은 `src/content/home/<lang>/news.json`의 번역을 씁니다.

### 이미지·PDF·영상
- 화면 이미지: `src/assets/img/`. 콘텐츠 파일에는 파일 이름만 적습니다(`"img": "lh-portfolio.webp"`).
- 카탈로그·회사소개서 PDF: `public/files/`(주소 고정). 기업영상: `public/media/`.

### 설정
- 문의 서버, 인스타그램·블로그: [`src/config/client.ts`](src/config/client.ts).
- 사이트 주소, GA: [`site.config.mjs`](site.config.mjs).

### 지금 사이트에서 다시 옮기기
원본 사이트가 바뀌어 문구를 다시 옮겨야 하면(덮어씁니다):

```bash
git clone https://github.com/wickedstormkr/homepage_renewal ../homepage_renewal
npm run migrate:home -- ../homepage_renewal         # 홈 문구(네 언어) → src/content/home
bash scripts/migrate/copy-assets.sh ../homepage_renewal   # 이미지·PDF·영상·글꼴·소식·용어표
```

## 움직임과 접근성
- 오른쪽 위 '움직임 멈춤' 버튼이 반복 애니메이션을 모두 멈춥니다(KWCAG 6.2.2). 선택은 브라우저에 기억되고, '동작 줄이기' 설정이면 멈춘 상태로 시작합니다. 오프닝 연출(데이터 아트의 떠다님)도 `src/scripts/motion.ts`의 `motionAllowed()`·`onMotionChange()`를 따릅니다.
- 언어는 자동으로 옮기지 않습니다. 브라우저 첫 언어가 페이지와 다르면 그 언어로 안내 띠만 띄웁니다.

## 글꼴
- 배포본은 빌드 때 사이트에 나온 글자만 잘라 Pretendard 두 파일(라틴·한글, 가변 굵기)을 만듭니다. 한국어 홈 글꼴 전송량은 지금 사이트 방식의 약 1/3입니다(`scripts/fonts/subset.mjs`).
- 글꼴은 첫 그리기를 막지 않도록 비동기로 받습니다. 그 사이 대체 글꼴은 글자 폭을 Pretendard·Sora에 맞춰 두어 화면 밀림(CLS)을 줄입니다(`src/styles/base.css`).
- 일본어 가나·한자는 Pretendard에 없어 시스템 글꼴로 그립니다(지금 사이트와 같음).
