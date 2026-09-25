# en.json 검토 메모

대상: `i18n/en.json` (349개 단위, 재생성된 ko.json과 키 집합·순서 동일. `delta_20260925.json`과 `delta2_20260925.json` 반영). 용어 근거는 `i18n/en_terms.md`.
검증: JSON 파싱, 키 일치, 빈 값 0, em/en dash 0, 한글 0, 태그·클래스·img 일치, `&` 이스케이프, 메모리 빌드 시 빠진 번역 0, 렌더링 결과 본문·head에 한글 0.
레이아웃: 로컬 미리보기(스크래치 폴더)로 1440·1280·1024·900·800·768·761·390·360px에서 가로 넘침과 라벨 잘림을 확인했다.

## 1. 검토가 필요한 선택

1. **히어로 h1 3줄 구성 (모바일 재확인 필요)**: `Every Learning Moment,` / `Designed for` / `Growth.`(그라데이션). 국문의 "성장의 데이터" 강조를 영문 "Growth."에 옮겼다. 히어로 그리드 CSS가 고쳐진 뒤 다시 재 보니 첫 줄이 348px이라 390px(열 342px)과 360px(열 312px)에서 두 줄로 꺾여 모두 4줄이 된다. 1440px도 열 621px에 609px로 여유가 적다. 대안은 `Every` / `Learning Moment,` / `Designed for <span class="g">Growth.</span>`(가장 긴 줄 304px)로, 모든 폭에서 3줄을 유지한다. 델타 작업 범위 밖이라 값은 바꾸지 않았다.
2. **히어로 문단이 짧아짐**: 데스크톱에서 `br-d` 앞뒤 구간이 각각 한 줄에 들어가도록 "학습 활동을"을 따로 옮기지 않았다. 결과 문장은 "Wicked Storm collects and stores learning data using global standards, and AI analysis informs what administrators, instructors, and learners do next."이다. 1440~1920px에서 둘째 줄 여유가 7~11px라 거의 꽉 찬다. 더 길게 고치면 3줄로 넘어가면서 끝에 짧은 줄이 남는다.
3. **LearnHubble AI 제목 강조 범위**: `A personalized teaching and <span class="gc nw">learning platform</span> with AI interaction`. `gc nw` 클래스를 유지해야 하는데 "teaching and learning platform" 전체를 줄바꿈 금지로 묶으면 모바일(30px)에서 화면 밖으로 나간다. 그래서 강조를 "learning platform"으로 좁혔다.
4. **학습의 선순환 그림 속 라벨(delta2 반영)**: 범례가 다시 그림 안 라벨(카탈로그 p.6~7 배치)로 바뀌었다. 설명 다섯 개는 카탈로그 영문을 가져왔다.
   - 운영자·교수자: 카탈로그 p.7·p.6 문장 그대로.
   - Lecognizer·Lecognizer AI: 카탈로그 문장에서 맨 앞 주어("Lecognizer", "Lecognizer AI")만 뺐다. 바로 위 pill이 제품명을 보여 주기 때문이다. 원문 그대로 두면 Lecognizer가 4줄이 되어 1280·1440px에서 "During the Semester" 태그와 겹친다. 뺀 뒤에는 1280~1920px에서 다섯 개 모두 3줄 이하이고 겹침이 없다.
   - 학습자: 사이트 국문이 카탈로그 국문("AI와 교수자가 개입해")과 달라서("AI와 상호작용하며") 카탈로그 영문을 그대로 쓸 수 없었다. `Learners interact with AI when they need it, to keep learning effectively.`로 썼다(카탈로그의 "to keep learning effectively"는 유지).
   - 태그("학기 중/학기 후")는 이후 페이지에서 삭제됐다. 캡션은 `This semester’s learning data informs next semester’s learning design.`
   - Lecognizer AI 라벨 칸이 이미지 폭 약 13.5%로 좁아져, 설명을 12단어 이하로 다시 줄였다: `Identifies where many learners struggled to inform next semester’s learning design.`(11단어). 카탈로그 p.7의 "identify where many learners struggled"와 "inform next semester’s learning design"을 이어 붙인 것이다.
   - 운영자 문장의 `<span class="nw">`는 "교과·직무역량"에 해당하는 `academic and job-related`에 씌웠다.
   - ~~태그 겹침~~: 태그가 삭제되어 해당 없음. 새 배치(좁아진 Lecognizer AI 칸)의 줄 수는 렌더링으로 다시 확인하지 않았다.
4-1. **References 제목 한 줄(delta2)**: `<span class="g">Data expertise</span> proven in public and education`. 이전의 "... settings"까지 넣으면 1280~1920px에서 2줄로 넘어가서 뺐다. 900~1920px에서 한 줄임을 확인했다.
5. **역량맵 설명**: "1EdTech CASE로 연결된 강의와 역량에서 어려움의 원인을 찾습니다"를 `Helps trace the causes of difficulty ...`로 썼다. 기능이 원인을 확정하는 것처럼 읽히지 않게 하려는 것이고, AI는 찾아 주고 판단은 사람이 한다는 원칙에 맞춘 것이다.
5-1. **LearnHubble AI 한 줄 소개(델타)**: `In lectures and assignments, AI offers explanations and hints when needed.`(74자). 지침은 약 70자이지만 `.lead-1` 폭 제한이 없어 1024~1920px 모두 한 줄로 들어가는 것을 확인했다. 국문에 더 가까운 `AI offers explanations and hints when learners need help in lectures and assignments.`(85자)도 한 줄에 들어가니 선택이 필요하다.
5-2. **Lecognizer AI 소개(델타)**: `An AI solution that analyzes learning data stored in Lecognizer. ...`로 썼다(이전 "AI feature built into Lecognizer"는 삭제). 번호 표식 `<i>01</i>`~`<i>04</i>`, `<i>1</i>`~`<i>5</i>`, `<i class="blank"></i>`는 그대로 두었다.
6. **회사 수치 카드 단위(건·등급·종)**: 영어에는 맞는 단위가 없다. 그래서 단위 값을 `&nbsp;`(보이지 않는 공백)로 두고 설명문에 의미를 담았다. 결과는 `2 / AI patents granted`, `1 / GS certification grade (Lecognizer)`, `3 / Global standards applied · xAPI, Caliper, CASE`이다. "Grade 1" 어순은 숫자 뒤에 단위가 붙는 구조라 만들 수 없다.
7. **동의 문구 어순**: 체크박스 label이 flex(gap 10px)라서 텍스트 조각 사이에 자동으로 간격이 생긴다. 그래서 `I agree to the` + [collection and use of personal information] + `for handling my inquiry.` 순서로 나눴다. 키 331·333의 영문 뜻은 국문 조각과 자리가 바뀌어 있다. 모바일에서는 이 조각들이 3줄로 나뉘는데, 국문 페이지도 같은 구조다.
8. **"유입 경로 직접 입력 \*" 라벨**: `How you found us *`로 두어 main.js 영문 문자열(`etcDirect`)과 똑같이 맞췄다. JS가 선택 즉시 이 문구로 바꾸기 때문이다. 다만 main.js에는 "found us" 표현(`Please choose how you found us.` 등)이 남아 있어, 지정받은 메인 라벨 "How did you hear about us?"와 표현이 다르다. main.js 영문 문자열을 맞출지 결정이 필요하다.
9. **data-auto 값**: 빌드 스크립트가 이제 `data-auto`를 번역하지 않아 서버에는 국문 값이 그대로 간다(해결됨). 그래서 렌더링 결과에 남는 한글은 이 속성 3개(인스타그램·블로그·박람회·행사)뿐이며 의도된 것이다.
10. **연도 범위**: "2021~2026"은 dash를 쓸 수 없어 `2021 to 2026`으로 썼다(연혁 제목, aria-label).
11. **주소**: 지시대로 `901 to 905, Building A, ...`로 썼다. 영어 주소로는 `Rooms 901 to 905, Building A, ...`가 더 자연스러우니 선택이 필요하다.
12. **twitter:title**: "WICKED STORM · 위키드스톰"은 영어로 옮기면 같은 이름이 두 번 나와서 `WICKED STORM`만 남겼다.
13. **강원 교육청 이름**: 회사소개서를 따라 `Gangwon Office of Education`으로 썼다. 그런데 레퍼런스 로고 이미지에 찍힌 공식 영문은 `Gangwon State Office of Education`이고, 경기 로고는 `GYEONGGIDO OFFICE OF EDUCATION`이다. 공식명으로 바꿀지 결정이 필요하다.
14. **연혁 기관명 표기**: 영어 사용자를 위해 국문 약칭(중기부·산업부·인사혁신처)을 풀어 썼다. MSS는 2023년 항목에서 한 번 풀어 쓰고, 2025년 항목에서는 약칭만 썼다.
15. **죽은 키(델타 전 기준 84개)**: 부모 단위(h1·h2·p·li 등)가 번역되면 빌드 스크립트가 그 안쪽을 다시 보지 않는다. 그래서 16~19, 21~22, 47~49 같은 조각 키 84개는 실제 페이지에 쓰이지 않는다. 값은 채워 두었지만 어순상 조각끼리 이어 붙이면 문장이 되지 않는 것도 있다(예: "로" → `into`). 실제 쓰이는 키는 257개다.

## 2. 번역 밖의 문제 (빌드·디자인 쪽 확인 필요)

1. ~~히어로 eyebrow와 h1 중복~~: eyebrow가 `WICKED STORM · Learning Data & AI`로 바뀌어 해결됐다.
2. ~~모바일 히어로 가로 잘림~~: 그리드 CSS 수정으로 해결됐다. 390·360px에서 가로 넘침이 없는 것을 다시 확인했다(남은 문제는 위 1번 h1 첫 줄 꺾임).
3. 한국어로만 남는 것: 제품 화면 캡처(파이프라인 단계 화면 포함), 레퍼런스 로고 이미지, 기업 홍보 영상, 뉴스 카드(board.js가 data/posts.json의 국문 글로 다시 그림), 연결된 기사·개인정보처리방침 페이지. 영문 문구는 이것들이 영어라고 주장하지 않는다.
4. `scripts/__pycache__/build_i18n.cpython-314.pyc`는 검증하려고 모듈을 import할 때 다시 생성됐다(바이트코드 캐시). 다른 파일은 건드리지 않았다.

## 3. 카탈로그 확인 필요

기준: 인쇄 PDF `files/WICKEDSTORM_Catalog_2026_EN.pdf`(우선), DOCX `위키드스톰_카탈로그_영문_확정원고_20260920_v4.docx`. 사이트에서 몰래 "고친" 것은 없다. 각 항목에 사이트에서 쓴 표현을 적었다.

1. **슬로건·비전·미션이 회사소개서(9/22 개정)와 다름.**
   - 카탈로그 슬로건: "We turn every learning moment into data for growth." / 회사소개서·사이트 eyebrow·JSON-LD: "Every Learning Moment, Designed for Growth."
   - 카탈로그 비전: "A global EdTech company opening a new era of learning with learning data and AI"(표지: "With Learning Data and AI / A Global EdTech Company / Opening a New Era of Learning") / 회사소개서: "A global EdTech company shaping a new era of learning through data and AI."
   - 카탈로그 미션: "We connect every learning experience through global data standards to build evidence for better education and growth." / 회사소개서: "...through data built on global standards, creating the foundation for better education and growth."
   - **사이트 사용**: 회사소개서 문구(지정 공식 문구). 카탈로그 재인쇄 때 맞출지 결정이 필요하다.
2. **법인 영문명이 다름**: 카탈로그 연혁 2021은 "Founded Wicked Storm Co., Ltd.", 회사소개서·특허·사이트 JSON-LD는 "Wicked Storm Inc."이다. **사이트 사용**: `Wicked Storm Inc.`(연혁·푸터 모두). 등록된 영문 상호를 확인해야 한다.
3. **Lecognizer 한 줄 표기가 매체마다 조금씩 다름**: 카탈로그 p.3은 "A learning data repository built on global standards, with AI anomaly detection"(쉼표 있음), p.4 제목은 "...Built on Global Standards with AI Anomaly Detection"(쉼표 없음), 회사소개서는 "Global-standard learning data store with AI anomaly detection"(store), 작업 지시 문구는 "...with AI-powered anomaly detection"이다. **사이트 사용**: 카탈로그 p.3 문장(쉼표 있음, "AI anomaly detection").
4. **LearnHubble AI 한 줄이 카탈로그 안에서 두 가지**: p.3 "A learning experience platform supporting teaching, learning, and operations with analyzed learning data and AI interaction", p.5 "A Personalized Teaching and Learning Platform with AI Interaction". 회사소개서에는 "AI-interactive teaching & learning platform"도 있다. **사이트 사용**: 국문 "AI와 상호작용하는 맞춤형 교수·학습 플랫폼"에는 p.5 문장을 쓰고, "AI 학습 경험 플랫폼"(og 설명)에는 지정 문구 "AI-powered learning experience platform"을 썼다.
5. **"평소와 다른 신호"의 영문이 흔들림**: 카탈로그 p.3은 "unusual patterns"인데, 회사소개서는 "unusual signals"이다. 카탈로그 안에서도 신호 자체는 "signals"(p.5 "signals that need attention", "AI hints triggered by detected signals")라서 같은 개념이 patterns와 signals로 섞여 있다. **사이트 사용**: "평소와 다른 신호"는 `unusual patterns`, 그냥 "신호"는 `signals`.
6. **INNOBIZ 표기**: 카탈로그는 "INNOBIZ", 회사소개서는 "Inno-Biz"이다. **사이트 사용**: `INNOBIZ certification (AA)`.
7. **경기도교육청 표기**: 카탈로그는 "Gyeonggi Provincial Office of Education", 회사소개서는 "Gyeonggi Office of Education", 로고 이미지는 "GYEONGGIDO OFFICE OF EDUCATION"이다. **사이트 사용**: 카탈로그 표기.
8. **국가 단위 허브 복수형**: 카탈로그 p.4 "It is used in national-level learning data hubs ..."는 복수형이다. 국문은 "국가 단위 학습 데이터 허브를 비롯해"로 교육부 허브 1건을 가리켜서, 복수형은 실적을 부풀려 읽힐 수 있다. **사이트 사용**: `a national-level learning data hub`(단수).
9. **2026 연혁 문장 반복**: "Joined the founding board of 1EdTech Korea and joined 1EdTech as a Contributing Member"에 joined가 두 번 나온다. 국문은 "Global Contributing Member", 회사소개서는 "1EdTech Global Contributing Member"라서 "Global" 유무도 다르다. **사이트 사용**: 국문 사이트대로 `1EdTech Contributing Member`, 설립 이사회는 `founding board member`.
10. **ADL 설명**: "Earned LRS certification from ADL, the U.S. Department of Defense's e-learning standards initiative"에서 국문 "연구기관"을 "initiative"로 옮겼다. 이 항목은 사이트에서 쓰지 않았다(사이트는 `xAPI LRS certification from ADL (U.S.)`).
11. **아포스트로피가 섞임**: 카탈로그 PDF가 곡선(’, "semester’s")과 직선(', "Service's", "Defense's")을 섞어 쓴다. **사이트 사용**: 모두 곡선 `’`.
12. **수치 표기 차이(PDF와 DOCX)**: PDF는 "400M /day", "11,000 TB /day", "250 RPS /core"로 슬래시 앞에 공백이 있고, DOCX는 "400 million records/day", "11,000 TB/day"이다. 사이트에서는 쓰지 않았지만 표기 통일이 필요하다.
13. **PDF 텍스트 레이어 문제**: pdftotext로 뽑으면 "offices/Office"가 "ofÏces/OfÏce"로 나온다(ffi 합자 글리프 매핑 문제). 인쇄 화면은 정상일 수 있지만, PDF에서 복사하거나 검색하면 깨진다. 웹에 올린 PDF라 확인을 권한다.
14. **연구소 명칭**: 카탈로그는 "AI Education Technology Research Institute", 회사소개서는 "AI Education Technology Lab"이다. 사이트에서는 쓰지 않았다.
15. **역량맵 명칭**: 카탈로그는 교과역량맵을 "Academic Competency Map"이라고 한다. 사이트 국문은 "역량맵"이라 지정 용어 `Competency Map`을 썼다.
16. **솔루션 개수가 카탈로그와 다름(델타로 새로 생긴 문제)**: 사이트 국문이 "세 솔루션과 세 역할"로 바뀌어 Lecognizer AI를 독립 AI 솔루션으로 소개한다. 그런데 카탈로그 PDF p.3 "Wicked Storm Solutions"에는 Lecognizer와 LearnHubble AI 두 개만 있다. p.4 주요 기능과 회사소개서 p.6("Anomaly signal detection by Lecognizer AI", "its AI flags unusual signals")도 Lecognizer AI를 Lecognizer 안의 기능으로 설명한다. **사이트 사용**: 지시대로 `Three solutions and three roles`, `An AI solution that analyzes learning data stored in Lecognizer`. 카탈로그·회사소개서 개정 때 맞출지 결정이 필요하다.
17. **교수자 설명이 카탈로그와 다름**: 카탈로그 p.6 교수자는 "Instructors use AI alerts to plan additional lessons or support learners who need help."(교수자가 직접 계획), 새 사이트 국문은 "AI가 만든 보충 수업 초안을 확인해 적용합니다."(AI 초안 → 교수자 확인·적용)이다. **사이트 사용**: `Reviews and applies AI drafts for additional lessons.` 용어는 카탈로그 p.5 "drafts"와 "People review and apply them"에서 가져왔다. 두 매체가 다른 이야기를 하지 않는지 확인이 필요하다.
18. **학습자 설명(delta2로 갱신)**: 카탈로그 p.6 국문은 "필요한 순간 AI와 교수자가 개입해, 학습이 끊기지 않고 효과적으로 이어집니다"이고 영문은 "Learners receive timely support from AI and instructors to keep learning effectively."이다. 새 사이트 국문은 "필요한 순간 AI와 상호작용하며, ..."로 교수자 개입이 빠져 있어, 카탈로그 영문을 그대로 쓰면 국문에 없는 "instructors"가 들어간다. **사이트 사용**: `Learners interact with AI when they need it, to keep learning effectively.` 국문과 카탈로그 중 어느 쪽에 맞출지 결정이 필요하다.
19. **Lecognizer 라벨 문장(delta2)**: 국문 "모든 학습 활동이 국제 표준 규격으로 수집되어 1EdTech CASE 체계로 쌓입니다"는 카탈로그 p.7 국문과 같다. 카탈로그 영문은 "CASE 체계로 쌓는다"를 "links the data to competency frameworks based on 1EdTech CASE"로 옮겨서, 국문(체계에 쌓임)보다 범위가 좁다(역량 체계로 한정). **사이트 사용**: 카탈로그 영문(주어만 뺌).
20. **운영자 문장에서 "다음 학기"가 빠짐**: 카탈로그 p.7 국문은 "...운영자가 다음 학기 교과·직무역량 체계(CASE 기반)를 보완합니다."인데, 영문 "Administrators review AI alerts and raw data. They refine CASE-based academic and job-related competency frameworks."에는 "next semester"가 없다. 사이트 국문에도 "다음 학기"가 있다. **사이트 사용**: 지시대로 카탈로그 영문 그대로. 카탈로그 재인쇄 때 "for the next semester"를 넣을지 결정이 필요하다(카탈로그 p.5 운영자 설명에는 "for the next semester"가 있다).
