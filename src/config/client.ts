/**
 * 브라우저에서 쓰는 설정(지금 사이트 js/site-config.js에 해당).
 *
 * CONTACT_API: 국가 정보를 전달하는 AWS CloudFront 문의 경로. 기존 Lambda 메일 서버로 연결한다.
 *   엔드포인트를 옮길 때만 바꾼다. 받는 값: {name, affiliation, email, inquiry, userTraffic, userTrafficEtc?, subject}
 * SOCIAL: 회사 인스타그램·블로그 주소. 채우면 홈 '최근 소식' 아래 채널 띠와 푸터 링크가 나타나고,
 *   비워 두면 숨겨진다. https:// 로 시작하는 주소만 쓴다. label은 채널 띠에 보이는 이름(예: "@wickedstorm_official").
 * SHOW_SOLUTION_SITES: 솔루션 사이트(lecognizer.ai · learnhubble.ai)로 가는 링크를 보일지. 지금은 숨긴다(홈 제품 카드의
 *   '자세히 보기', 제품 페이지의 사이트 링크). true로 바꾸면 다시 나타난다.
 */
export const CONTACT_API = 'https://wickedstorm.kr/api/contact';

export const SHOW_SOLUTION_SITES = false;

export const SOCIAL: Record<'instagram' | 'blog', { url: string; label: string }> = {
  instagram: { url: '', label: '' },
  blog: { url: '', label: '' },
};
