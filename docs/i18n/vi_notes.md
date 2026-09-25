# vi.json 검토 메모 (베트남어)

작성 2026-09-25. 대상 `i18n/vi.json`. 용어 근거는 `i18n/vi_terms.md`에 있다.

- **키**: 349개. 다시 뽑은 ko.json과 키 집합이 정확히 같다. 1차 델타(`delta_20260925.json`: 28개 삭제, 32개 추가)와 2차 델타(`delta2_20260925.json`: 20개 추가, 16개 삭제)를 적용했다.
- **검증**: JSON 파싱 정상, 빈 값 0, em/en dash 0, 한글 0, `<img>` 태그 원문과 동일, 히어로 h1 line 블록 3개, `br-d` 앞 공백 유지, `&`는 `&amp;`로 이스케이프했다. 현재 index.html로 메모리 빌드하면 빠진 번역이 0이다. 렌더링 결과에 남는 한글은 `data-auto` 3개뿐이다. 빌드 스크립트가 일부러 번역하지 않는 값이다.
- **레이아웃**: 스크래치 폴더에서 로컬 렌더링으로 확인했다(1440·1280·1024·768·390px). 가로 넘침은 없다. 헤딩·버튼에서 단어가 음절 중간에 끊기는 곳은 `&nbsp;`로 막았다.

## 1. 원어민 검수 포인트 (선택한 표현)

1. **슬로건**: 카탈로그 문구 "Biến mỗi khoảnh khắc học tập thành dữ liệu cho sự phát triển."을 썼다. 히어로 h1은 `Biến mỗi khoảnh khắc` / `học tập thành dữ liệu` / `cho sự phát triển` 3줄이다. 국문의 "성장의 데이터"에 해당하는 "dữ liệu"와 "cho sự phát triển"에 그라데이션을 걸었다. 두 줄에 걸친 구라서 `span.g`가 2개다.
2. **"도입 문의" 버튼 = `Liên hệ`**: 처음에는 "Tư vấn triển khai"로 썼다. 그런데 1024px에서 헤더 메뉴가 로고에 붙고 "LearnHubble AI"가 두 줄로 꺾였다. 측정해 보니 국문 버튼 폭은 91px, 로고와의 간격은 48px였다. `Liên hệ`(89px, 간격 49px)만 국문과 같은 여유가 나왔다. "Nhận tư vấn"은 간격이 16px, "Liên hệ tư vấn"은 4px라서 쓰지 않았다. 영문도 "Contact us"다. 같은 키라서 히어로 버튼도 `Liên hệ`다.
3. **호칭**: 지정 문구 "Bạn biết đến chúng tôi qua đâu?"에 맞춰 폼 영역에서만 "bạn"을 썼다. 나머지 본문에는 2인칭을 쓰지 않았다(감사메일은 "Quý vị"). main.js VI 문구("Yêu cầu của bạn…")도 "bạn"이다.
4. **수치 카드 단위(건·등급·종) = `&nbsp;`**: 베트남어는 "hạng 1"처럼 단위가 숫자 앞에 온다. 숫자 뒤 단위 칸에는 맞는 말이 없어서 영문판처럼 `&nbsp;`를 넣었다. 뜻은 설명문에 담았다: `2` / Bằng sáng chế AI được cấp, `1` / Hạng chứng nhận GS (Lecognizer), `3` / Chuẩn quốc tế được áp dụng · xAPI·Caliper·CASE.
5. **학과 교육과정 운영자 = "Quản trị viên chương trình đào tạo"**: 카탈로그 용어다. 지시문 예시 "Quản lý chương trình đào tạo"는 쓰지 않았다(2-5 참고).
6. **교육과정은 두 가지로 옮겼다**: 학과 교육과정(대학 학과 과정, 역할명·"교육과정 보완")은 "chương trình đào tạo"다. CASE·국가 교육과정 맥락("교육과정 맥락", "교육과정 표준체계")은 "chương trình giáo dục"다. 베트남에서는 앞의 것이 대학·직업 교육 과정, 뒤의 것이 초중등 교육과정을 가리킨다.
7. **강의도 두 가지로 옮겼다**: 과목·코스 단위(선수·후속 강의, CASE 역량맵)는 카탈로그처럼 "khóa học"이다. 개별 강의 내용·영상("개념 강의 04", "강의와 과제")은 "bài giảng"이다.
8. **구간 = "phần"**: 카탈로그 "những phần nhiều người học gặp khó khăn"을 따랐다. 영상 구간에는 "đoạn"이 더 자연스러울 수 있다.
9. **성취기준 = "yêu cầu cần đạt"** (CASE 카드): 베트남 일반교육과정(GDPT 2018)의 공식 용어다. 대학 맥락이면 "chuẩn đầu ra"가 맞을 수 있다.
10. **인사이트 = "Insight"** (파이프라인 4단계 제목): 회사소개서 표기("Insight trực quan")를 따랐다. 용어집 후보 "thông tin chuyên sâu"는 제목으로 쓰기에 길다.
11. **"강의 Q&A" 칩 = "Mục Q&A"**: 빌드 스크립트가 `&amp;`에서 텍스트를 자르기 때문에 앞 조각이 "Q"로 끝나야 한다. main.js가 이어서 그리는 칩은 "Hỏi đáp bài giảng"이라서 두 표현이 섞여 보인다(4-2).
12. **LearnHubble AI 소개 한 줄(델타 규칙)**: "AI giải thích và gợi ý đúng lúc người học cần khi học và làm bài tập." (68자). 1440px에서 한 줄에 들어가는 것을 확인했다.
13. **LearnHubble h2**: `gc nw` 한 덩어리 "Nền tảng giảng dạy và học tập"은 모바일(30px)에서 화면 밖으로 나간다. 그래서 같은 클래스의 span 두 개("Nền tảng giảng dạy" + "và học tập")로 나눴다. 문장은 카탈로그 한 줄 소개와 같다.
14. **`&nbsp;` 묶음**: 베트남어는 음절마다 띄어 쓰기 때문에 "cá / nhân hóa", "bằng sáng / chế"처럼 단어 중간에서 줄이 바뀐다. 헤딩, 버튼, 배지, 기관 라벨, 표준 카드 설명, 수치 카드 라벨에만 복합어 안의 공백을 `&nbsp;`로 바꿨다(예: `cá&nbsp;nhân&nbsp;hóa`). 본문 문단에는 넣지 않았다.
15. **"1EdTech Korea 설립 이사회" 배지**: 원문 구조가 `<b>1EdTech Korea</b>&nbsp;설립 이사회`라서 어순을 바꿀 수 없다. 그래서 `1EdTech Korea (thành viên hội đồng sáng lập)`로 두었다.
16. **동의 문구 어순**: 체크박스 label은 flex(간격 10px)라서, 조각을 `Tôi đồng ý với việc` + [thu thập và sử dụng thông tin cá nhân] + `để xử lý yêu cầu liên hệ.`로 나눴다. 키 "문의 확인을 위한"과 "에 동의합니다."의 뜻이 서로 자리를 바꾼 셈이다.
17. **조각 키**: 부모 단위(h1·h2·p·li 등)가 번역되면 그 안쪽 조각 키(예: "로", "을 완성합니다")는 쓰이지 않는다. 값은 채워 두었지만 조각끼리 이어 붙인다고 문장이 되지는 않는다.
18. **SEO 제목**: `<title>`과 twitter:title에서는 "WICKED STORM · Wicked Storm"처럼 이름이 두 번 나오지 않게 뒤쪽 이름을 뺐다.
19. **"2021~2026"**: dash를 쓸 수 없어 물결표를 그대로 두었다. 베트남어에서는 흔한 표기가 아니다. 필요하면 "2021 đến 2026"으로 바꿀 수 있다.
20. **히어로 문단**: 1440px에서 3줄이다(국문은 2줄). 첫 구간은 `br-d` 앞에서 한 줄에 들어가도록 "dữ liệu học tập theo chuẩn quốc tế"로 줄였다(카탈로그 p.3 문장과 같다).

21. **Learning Loop 그림 속 설명 5개(2차 델타)**: 카탈로그 p.6·7의 베트남어 문장을 그대로 썼다. Lecognizer, 학과 교육과정 운영자, 교수자가 여기에 해당한다. 사진 캡션도 카탈로그 문장이다. **Lecognizer AI 설명은 줄였다**: 라벨 칸이 이미지 폭의 약 13.5%로 좁아져서, 16단어 이하 지시에 맞춰 "Tìm những phần nhiều người học gặp khó khăn, làm cơ sở cho học kỳ tới."(16단어, 1440px에서 3줄)로 썼다. 카탈로그 핵심구 "những phần nhiều người học gặp khó khăn"과 "làm cơ sở"는 그대로 두었다. "학기 중/학기 후" 태그는 사이트에서 빠졌다. **예외는 학습자 설명**이다. 사이트 국문("필요한 순간 AI와 상호작용하며…")이 카탈로그 국문("AI와 교수자가 개입해…")과 달라서 카탈로그 틀만 빌려 새로 썼다: "Người học tương tác với AI kịp thời khi cần để tiếp tục học hiệu quả." 운영자 설명의 `span.nw`는 "năng lực học thuật và nghề nghiệp"를 감싼다. 1440px에서 4줄, 390px에서 3줄이고 넘침은 없다. 카탈로그 운영자 문장에는 국문의 "다음 학기"가 없다(카탈로그 원문 그대로 둠).
22. **레퍼런스 제목(한 줄로 바뀜)**: 국문은 `<br>` 없이 한 줄이다. 베트남어 "Năng lực dữ liệu đã được kiểm chứng tại khu vực công và giáo dục"는 1440px에서도 2줄로 자연스럽게 꺾인다. 한 줄로 만들려면 "tại khu vực công và giáo dục"를 빼야 해서 그대로 두었다.

## 2. 카탈로그 확인 필요

기준 자료는 인쇄 PDF `files/WICKEDSTORM_Catalog_2026_VI.pdf`(우선)와 원고 `…베트남어_확정원고_20260920_v4.docx`다. 사이트에서 카탈로그 문구를 몰래 고친 곳은 없다. 항목마다 사이트에 쓴 표현을 적었다.

1. **슬로건이 자료마다 세 가지다.**
   - 카탈로그(PDF 표지·p.2, 원고 v4), 부스 문구정본(09-20): "Biến mỗi khoảnh khắc học tập thành dữ liệu cho sự phát triển."
   - 회사소개서 v2.0.3(09-23 결정, 부스 패널 표기라고 기록됨): "Mỗi khoảnh khắc học tập, được thiết kế cho sự phát triển."
   - 감사메일 v6 푸터: "Biến mỗi khoảnh khắc học tập thành dữ liệu để thiết kế sự phát triển."
   - 카탈로그 문구에는 국문 "설계합니다"(thiết kế)의 뜻이 없다(뜻: "모든 학습 순간을 성장을 위한 데이터로 바꿉니다"). 감사메일 문구의 "thiết kế sự phát triển"(성장을 설계하다)은 베트남어로 조금 어색하다.
   - **사이트 사용**: 코디네이터 후속 지시에 따라 카탈로그 문구. 세 자료를 하나로 맞출지 결정이 필요하다.
2. **"학습의 선순환"**: 원고 v4 p.6에는 "Vòng tuần hoàn học tập" / "Learning Loop"가 함께 있다. 인쇄본에는 "Learning Loop"만 있다. 베트남 독자에게는 영어 용어만 남는다. **사이트 사용**: "Learning Loop"(인쇄본, 감사메일과 같음).
3. **법인명**: 카탈로그 연혁 2021은 "Thành lập Wicked Storm Co., Ltd."다. 회사소개서(사용자 결정 2026-09-23 "Co., Ltd. 쓰지 않음"), 감사메일, 인증서 문구는 "Wicked Storm Inc."다. **사이트 사용**: "Wicked Storm Inc."(푸터, 연혁 2021).
4. **Lecognizer 한 줄 소개가 카탈로그 안에서 둘이다.** p.3은 "Kho dữ liệu học tập theo chuẩn quốc tế, ứng dụng AI để phát hiện dấu hiệu bất thường"이고, p.4는 "Kho dữ liệu học tập theo chuẩn quốc tế, phát hiện dấu hiệu bất thường bằng AI"다. 부스 문구는 "…phát hiện bất thường bằng AI"로 "dấu hiệu"가 빠졌다. **사이트 사용**: p.4 문구(국문 "AI 기반 이상 탐지를 갖춘 국제 표준 학습데이터 저장소"와 같은 원문이다).
5. **"Quản trị viên"**: 베트남어에서 "quản trị viên"은 보통 시스템 관리자(IT admin)를 뜻한다. 학과 교육과정 운영자는 "Người quản lý chương trình đào tạo" 또는 "Cán bộ quản lý đào tạo"가 더 자연스러울 수 있다. **사이트 사용**: 카탈로그대로 "Quản trị viên chương trình đào tạo", "quản trị viên".
6. **미션 문구의 뜻이 조금 옮겨졌다.** 카탈로그는 "thông qua chuẩn dữ liệu quốc tế"(국제 데이터 표준을 통해)다. 국문 "국제표준 데이터로"는 부스 대안 "bằng dữ liệu theo chuẩn quốc tế"(국제 표준을 따르는 데이터로)에 더 가깝다. **사이트 사용**: 카탈로그 문구.
7. **LearnHubble AI 솔루션 소개(p.3)가 길고 어색하다.** "…bằng dữ liệu học tập đã phân tích và khả năng tương tác với AI"는 "분석된 데이터와 AI 상호작용 능력으로" 식의 직역이다. 부스판은 "…và tương tác với AI"로 조금 다르다. 사이트에는 이 문장이 없어서 쓰지 않았다.
8. **"평소와 다른 신호"와 "이상 신호"가 모두 "dấu hiệu bất thường"이다.** 국문의 "평소와 다른"(완곡한 표현)과 "이상"(anomaly)의 차이가 사라진다. **사이트 사용**: 카탈로그대로 "dấu hiệu bất thường"으로 통일.
9. **벤처기업 = "doanh nghiệp venture (doanh nghiệp đổi mới sáng tạo)"**: "venture"를 번역하지 않았다. 회사소개서 v2 검토에서도 "doanh nghiệp mạo hiểm (venture)"가 제안된 적이 있다. **사이트 사용**: 카탈로그 인증 라벨 "Chứng nhận doanh nghiệp venture".
10. **1EdTech 표기**: 카탈로그 2026은 "gia nhập 1EdTech với tư cách Contributing Member"로 국문의 "Global"이 빠졌다. 회사소개서는 "1EdTech Global Contributing Member"다. 사이트 국문은 "1EdTech Contributing Member"라서 영향은 없다.
11. **처리량 표기(사이트에는 없음)**: 원고 v4는 "400 triệu bản ghi/ngày", 인쇄본은 "400M /ngày"다. 베트남 독자에게는 "400 triệu"가 자연스럽다. 라벨 "Lưu lượng thông điệp xử lý"와 단위도 서로 맞지 않는다.
12. **"Kiến tạo tương lai EdTech AI"**(표지·p.2, 사이트에는 없음): 어순이 "EdTech AI"다. "tương lai của EdTech ứng dụng AI"가 더 자연스럽다는 의견이 나올 수 있다.

## 3. 출처가 서로 다를 때 고른 것 (카탈로그 밖)

1. **대표 이름**: 처음에는 지시문대로 "Lee Jung-jun"을 썼다. 이후 코디네이터가 회사소개서 표기 "Jeongjun Lee"로 바꿨고, 그 값을 유지했다. 영문 사이트와도 같다.
2. **주소**: 지시문대로 "Phòng 901 đến 905, Tòa A, 161-8 Magokjungang-ro, Gangseo-gu, Seoul, Hàn Quốc"를 썼다. 회사소개서는 "Rm 901(en dash)905, Bldg A, …"처럼 방 번호 사이에 en dash가 들어 있다.
3. **xAPI 이상 학습 탐지 특허명**: 회사소개서 특허 카드는 "Hệ thống phát hiện học tập bất thường…"이다. 사이트는 카탈로그 연혁 표현 "phát hiện dấu hiệu bất thường trong học tập"에 맞췄다(뉴스 제목, 특허증 alt, 연혁).
4. **"나라장터 디지털쇼핑몰"**(사이트 국문): 카탈로그·회사소개서는 "조달청 디지털서비스몰"이다. 같은 곳으로 보고 카탈로그 표현 "sàn dịch vụ số của Cơ quan Mua sắm Công Hàn Quốc (PPS)"를 썼다. 국문도 통일할지 확인해 주세요.
5. **"경기도 AI 교원 역량 통합지원시스템"**(사이트 국문): 회사소개서는 발주처를 "경기도교육청"으로 적었다. 사이트는 국문대로 시스템 이름에 "tỉnh Gyeonggi"만 붙였다.
6. **"주요 레퍼런스"** = "khách hàng tiêu biểu"(감사메일)다. 카탈로그 "적용 기관"은 "Đơn vị sử dụng"이지만 사이트 국문과 맞는 쪽은 감사메일이다.

## 4. 번역 밖에서 확인이 필요한 것

1. **[필수] 베트남어 글자용 웹폰트가 없다.** `css/style.css`의 Pretendard 서브셋과 Sora(latin)는 ă·ơ·ư와 U+1EA0~1EF9(ạ, ế, ệ, ờ, ỹ 등)를 포함하지 않는다. 방문자 PC에 Pretendard가 설치되어 있지 않으면 이 글자만 시스템 글꼴로 바뀌어 한 단어 안에서 서체가 섞인다(예: "Biến"의 "ế"). 이 맥에서는 Pretendard가 설치되어 있어 티가 나지 않았다(렌더링 로그: 히어로 h1의 4글자가 로컬 "Pretendard ExtraBold"로 대체됨). `html[lang="vi"]`에 베트남어를 지원하는 글꼴(부스 그래픽에 쓴 Be Vietnam Pro 등)을 붙이거나, Pretendard의 라틴 확장 서브셋을 추가해야 한다.
2. **main.js의 VI 문구가 카탈로그 용어와 다르다.** 히어로 캡처 패널에서는 HTML 칩(이 파일)과 JS 칩이 함께 보인다. 맞춰 두면 좋은 것:
   - `insights`: "Tín hiệu · …" → 카탈로그 용어 "Dấu hiệu · …"
   - "đoạn"(Đoạn xem lại, Đoạn khó, Dừng ở đoạn này) → "phần"
   - "bổ trợ"(Bài giảng bổ trợ, Tài liệu bổ trợ) → 카탈로그 "bổ sung"
   - "Gợi ý AI" → 카탈로그 "Gợi ý từ AI"
   - "Bài tự luận" → "Bài tập tự luận"(과제 = bài tập), "3 trả lời" → "3 câu trả lời", "Hỏi đáp bài giảng" ↔ HTML 칩 "Mục Q&A"(1-11)
3. **data-auto**: 빌드 스크립트가 이제 번역하지 않으므로 서버에는 국문 값이 간다. utm_source 자동 선택도 VI 페이지에서 그대로 동작한다. 해결된 항목이다.
4. **한국어로 남는 것**: 제품 화면 캡처(파이프라인 단계 화면 포함), 레퍼런스 로고 이미지, 기업 홍보 영상, 뉴스 카드(board.js가 국문 posts.json으로 다시 그린다), 연결된 기사·개인정보처리방침 페이지. 베트남어 문구는 이것들이 베트남어라고 말하지 않는다. "Xem bài viết"(기사 보기)와 화면 주석에 "(tiếng Hàn)"을 붙일지는 선택 사항이다. 국문에 없는 말이라 넣지 않았다.
5. **히어로 h1 `.line{overflow:hidden}`**: 베트남어는 윗부호가 두 겹이다(ế, ổ). 렌더링에서는 잘리지 않았다. 다른 글꼴로 대체되는 환경(4-1)에서는 한 번 더 확인해야 한다.
