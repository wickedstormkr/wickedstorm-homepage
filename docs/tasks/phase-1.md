# 1단계: 기반 만들기

Astro 뼈대, 디자인 토큰, 네 언어, 자동 점검을 세우고, 지금 사이트의 내용을 옮깁니다. 먼저 저장소 루트의 `CLAUDE.md`와 `docs/redesign/analysis/index.html`을 읽습니다.

## 끝났다고 보는 기준
- `npm run build`로 정적 사이트가 나옵니다.
- 지금 사이트(`wickedstormkr/homepage_renewal`)의 내용이 새 구조로 모두 뜹니다:
  - 모든 섹션과 문구
  - 네 언어
  - 소식 목록과 상세
  - 개인정보처리방침, 링크 페이지, 404
- 히어로는 이번 단계에서 정적인 기본 층만 만듭니다: 제목, 리드, 버튼, 증빙 한 줄. 여섯 장면 연출은 2단계입니다.
- GitHub Actions에서 빌드와 자동 점검이 돌고, 결과가 PR에 남습니다.

## 할 일
1. **프로젝트**:
   - Astro 최신 안정판, TypeScript strict, 정적 출력.
   - 호스팅이 미정이므로 `site`와 `base`는 설정 한 곳에서 바꿀 수 있게 둡니다.
2. **디자인 토큰**:
   - homepage_renewal `css/style.css`의 `:root` 값을 옮깁니다: 배경, 글자, 선, 브랜드 그라디언트, 제품 조각(`--grad-lec`, `--grad-lhb`), `--accent`.
   - 글꼴도 옮깁니다: Pretendard Variable, Sora, 베트남어 글자 보강 서브셋.
   - 토큰은 한 파일에 모읍니다.
3. **네 언어**:
   - 원본은 homepage_renewal의 국문 `index.html`과 `i18n/en.json`·`ja.json`·`vi.json`입니다.
   - 섹션별 구조화 콘텐츠 파일로 다시 짜되, 문구는 그대로 옮깁니다.
   - 용어표와 노트(`i18n/*_terms.md`, `*_notes.md`)는 `docs/i18n/`으로 옮깁니다.
   - hreflang과 canonical을 넣고, 언어 스위처는 원어 이름으로 씁니다. 자동 언어 이동은 하지 않습니다.
4. **페이지**:
   - 홈: 지금 섹션 순서 그대로.
   - 소식 목록·상세: homepage_renewal `data/posts.json`을 콘텐츠 컬렉션으로.
   - 개인정보처리방침, 링크(인스타그램 프로필용), 404.
   - 이미지·PDF·영상은 homepage_renewal에서 가져와 Astro 자산 처리(AVIF/WebP, srcset)를 거칩니다.
5. **문의 폼**: 지금 엔드포인트와 필드, 유입 경로 자동 선택(UTM) 로직을 그대로 둡니다. 원본은 homepage_renewal의 `js/main.js`와 `js/site-config.js`입니다.
6. **자동 점검**:
   - `docs/redesign/responsive-audit.js`를 Playwright 테스트로 발전시킵니다. 폭 9개 × 네 언어에서 가로 넘침, 칸 밖 글자, 11px 미만 글자, 누르는 곳, 마지막 줄 한 단어를 봅니다. 영·베는 단어 수로 판단합니다.
   - 여기에 axe 접근성, Lighthouse CI(폰 예산), 깨진 링크 검사를 더합니다.
   - GitHub Actions 워크플로로 묶습니다.
7. **README**: 개발, 빌드, 점검 명령과 콘텐츠 수정 방법을 적습니다.

## 하지 않는 것
- 오프닝 여섯 장면 연출(2단계)
- 제품 화면 HTML 조각(3단계)
- 배포와 도메인 연결(호스팅 결정 대기)

## 결과물
- 브랜치 `phase-1/foundation`과 `main` 대상 PR. 병합하지 않습니다.
- PR 본문에 넣을 것:
  - 구조 설명(폴더, 콘텐츠 파일, 토큰)
  - 옮긴 내용 목록
  - 점검 결과(폭 × 언어)
  - 지금 사이트와 달라진 점
  - 남은 과제와 판단이 필요한 곳
- 대표 폭(390, 820, 1440)의 한국어·영어·베트남어 캡처를 PR에 붙입니다.
