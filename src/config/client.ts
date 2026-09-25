/**
 * 브라우저에서 쓰는 설정(지금 사이트 js/site-config.js에 해당).
 *
 * CONTACT_API: 문의 폼 전송 엔드포인트(Lambda Function URL). 지금 운영 중인 서버를 그대로 쓴다.
 *   엔드포인트를 옮길 때만 바꾼다. 받는 값: {name, affiliation, email, inquiry, userTraffic, userTrafficEtc?, subject}
 * SOCIAL: 회사 인스타그램·블로그 주소. 채우면 홈 '최근 소식' 아래 채널 띠와 푸터 링크가 나타나고,
 *   비워 두면 숨겨진다. https:// 로 시작하는 주소만 쓴다. label은 채널 띠에 보이는 이름(예: "@wickedstorm_official").
 */
export const CONTACT_API = 'https://v6pa5eyigfdkbuzm2rskahdf6y0xfsre.lambda-url.ap-northeast-2.on.aws';

export const SOCIAL: Record<'instagram' | 'blog', { url: string; label: string }> = {
  instagram: { url: '', label: '' },
  blog: { url: '', label: '' },
};
