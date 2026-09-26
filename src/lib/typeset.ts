/**
 * 조판: 마지막 줄에 한 단어만 남지 않게(CLAUDE.md '줄바꿈과 다국어').
 * 모든 페이지 HTML이 나가기 전에 한 번 거친다(src/middleware.ts). 콘텐츠 파일은 그대로 두고, 화면에 낼 때만 적용한다.
 *
 * - 한국어·영어·베트남어: 글 칸의 마지막 두 단어 사이 띄어쓰기를 줄바꿈 없는 공백(U+00A0)으로 바꾼다.
 *   <br>로 나눈 조각도 조각마다 따로(줄바꿈 앞 조각의 끝도 글 끝이다: 제목 '학습의 새로운 시대를 / 여는'처럼 한 단어 줄이 생기지 않게).
 *   두 단어가 너무 길면(합쳐 LIMIT자 초과) 좁은 칸에서 넘칠 수 있어 묶지 않는다.
 * - 일본어: 띄어쓰기가 없으므로 BudouX로 구를 나눠, 마지막 구가 짧으면 그 글자들 사이에 WORD JOINER(U+2060)를 넣어 한 덩어리로 묶는다.
 *   요소(span)를 끼우지 않는다: 버튼·링크처럼 flex(gap)인 칸에서 글이 두 조각으로 나뉘어 사이가 벌어지지 않게.
 * - 베트남어: 음절 사이가 띄어쓰기라 두세 음절 낱말이 줄 끝에서 갈라진다. 사이트에 자주 쓰는 낱말(VI_WORDS)은 음절 사이를
 *   줄바꿈 없는 공백으로 묶는다(제목·설명·본문 모두). 새 낱말을 자주 쓰게 되면 목록에 더한다.
 * - 숫자-숫자(특허·전화번호)는 하이픈에서 끊기지 않게 묶는다(.nb).
 * - 가운뎃점으로 이은 이름(A · B)은 점을 앞 낱말에 붙인다: 줄은 점 뒤에서만 바뀌어 줄 머리에 ·가 오지 않는다(모든 언어).
 * 글 칸 = 블록 태그(p, li, h1…) 또는 클래스가 있는 요소(대부분 블록·플렉스 항목). 글자 모양용 인라인 클래스는 제외.
 */
import { parse, HTMLElement, TextNode, type Node } from 'node-html-parser';
import { Parser, jaModel } from 'budoux';

const ja = new Parser(jaModel);
const LIMIT = 28;
const SKIP = new Set(['script', 'style', 'textarea', 'pre', 'code', 'title', 'option', 'select', 'svg', 'noscript', 'template', 'head']);
const INLINE = new Set(['a', 'b', 'strong', 'em', 'i', 'span', 'small', 'sup', 'sub', 'time', 'abbr', 'br', 'wbr', 'img', 'picture', 'source', 'mark', 'u', 's', 'q', 'cite']);
/** 글자 모양만 바꾸는 인라인 클래스(글 칸이 아님) */
const INLINE_CLASS = new Set(['g', 'gc', 'nw', 'bx', 'unit', 'arw', 'en', 'tnum', 'sr-only', 'yr']);

function isContainer(el: HTMLElement): boolean {
  const tag = el.rawTagName?.toLowerCase();
  if (!tag) return false;
  if (!INLINE.has(tag)) return true;
  const cls = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
  return cls.length > 0 && !cls.every((c) => INLINE_CLASS.has(c));
}

/** 글 칸 안의 글자 조각(안쪽 글 칸은 제외)을 <br> 자리에서 나눈 묶음들 */
function textSegments(el: HTMLElement, out: TextNode[][] = [[]]): TextNode[][] {
  for (const c of el.childNodes as Node[]) {
    if (c instanceof TextNode) out[out.length - 1].push(c);
    else if (c instanceof HTMLElement) {
      const tag = c.rawTagName?.toLowerCase();
      if (tag === 'br') { out.push([]); continue; }
      if (!tag || SKIP.has(tag) || isContainer(c) || c.classList.contains('sr-only')) continue;
      textSegments(c, out);
    }
  }
  return out;
}

const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const units = (raw: string) => raw.match(/&[a-zA-Z#0-9]+;|[\s\S]/gu) ?? [];
const isSp = (u: string) => u === ' ' || u === '\n' || u === '\t' || u === '\r';
const isNb = (u: string) => u === '&nbsp;' || u === '&#160;' || u === '\u00a0';

function bindSpaces(nodes: TextNode[]) {
  const full = nodes.map((n) => decode(n.rawText)).join('');
  const words = full.trim().split(/[ \t\n\r\u00a0]+/).filter(Boolean);
  if (words.length < 3) return;
  if ([...words[words.length - 1]].length + [...words[words.length - 2]].length > LIMIT) return;
  // 뒤에서부터 마지막 단어를 지나 처음 만나는 띄어쓰기를 &nbsp;로 바꾼다
  let inWord = false;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const u = units(nodes[i].rawText);
    for (let j = u.length - 1; j >= 0; j--) {
      if (isNb(u[j])) { if (inWord) return; continue; } // 이미 묶여 있음
      if (!isSp(u[j])) { inWord = true; continue; }
      if (!inWord) continue; // 끝의 공백
      let k = j;
      while (k > 0 && isSp(u[k - 1])) k--;
      u.splice(k, j - k + 1, '&nbsp;');
      nodes[i].rawText = u.join('');
      return;
    }
  }
}

/** 베트남어 낱말(두세 음절). 긴 것부터 맞춘다 */
const VI_WORDS = [
  'trí tuệ nhân tạo',
  'sách giáo khoa',
  'quản trị viên',
  'bằng sáng chế',
  'chương trình',
  'doanh nghiệp',
  'khoảnh khắc',
  'phương pháp',
  'hộ gia đình',
  'nguyên nhân',
  'chặng đường',
  'cá nhân hóa',
  'hiện trường',
  'kiểm chứng',
  'môi trường',
  'giải thích',
  'chuyển đổi',
  'thành tích',
  'chứng nhận',
  'phát triển',
  'trình diễn',
  'liên thông',
  'triển khai',
  'bất thường',
  'chất lượng',
  'người dùng',
  'tiên quyết',
  'giảng viên',
  'tiêu chuẩn',
  'minh chứng',
  'câu chuyện',
  'giới thiệu',
  'chính sách',
  'quyết định',
  'giải pháp',
  'tiếp theo',
  'phân tích',
  'danh sách',
  'toàn diện',
  'biến động',
  'học thuật',
  'trung tâm',
  'thông tin',
  'người học',
  'con người',
  'khởi điểm',
  'kỷ nguyên',
  'phát hiện',
  'bài giảng',
  'tiêu biểu',
  'tương tác',
  'khái niệm',
  'thông báo',
  'thời gian',
  'hoạt động',
  'vận hành',
  'đồng đội',
  'đánh giá',
  'tác động',
  'nội dung',
  'quốc gia',
  'ứng dụng',
  'kiểm tra',
  'tích lũy',
  'xác minh',
  'trình độ',
  'gia đình',
  'hệ thống',
  'mục tiêu',
  'huy hiệu',
  'tiểu học',
  'hiệu quả',
  'tài liệu',
  'sản phẩm',
  'tích hợp',
  'nhân lực',
  'sáng chế',
  'toàn cầu',
  'phản hồi',
  'thu thập',
  'năng lực',
  'lộ trình',
  'kế hoạch',
  'tiếp cận',
  'xây dựng',
  'giáo dục',
  'dấu hiệu',
  'nền tảng',
  'lãi suất',
  'thiết kế',
  'đối tác',
  'liên hệ',
  'yêu cầu',
  'biểu đồ',
  'quản lý',
  'mua sắm',
  'áp dụng',
  'kết nối',
  'dạy học',
  'cá nhân',
  'báo cáo',
  'khu vực',
  'dữ liệu',
  'điểm số',
  'tin tức',
  'học tập',
  'lớp học',
  'bài tập',
  'công cụ',
  'quốc tế',
  'đổi mới',
  'cần đạt',
  'lỗ hổng',
  'xem xét',
  'trả lời',
  'câu hỏi',
  'sự kiện',
  'tổ chức',
  'đào tạo',
  'bổ sung',
  'bảo mật',
  'tua lại',
  'hợp tác',
  'công ty',
  'lưu trữ',
  'tự động',
  'tư vấn',
  'học kỳ',
  'căn cứ',
  'xã hội',
  'hỗ trợ',
  'chỉ số',
  'rủi ro',
  'có thể',
  'yếu tố',
  'thế hệ',
  'cơ sở',
  'dự án',
  'hồ sơ',
  'gợi ý',
];
const VI_RE = new RegExp(`(?<![\\p{L}])(${VI_WORDS.join('|')})(?![\\p{L}])`, 'giu');
function bindVi(nodes: TextNode[]) {
  for (const n of nodes) {
    if (!n.rawText.includes(' ')) continue;
    n.rawText = n.rawText.normalize('NFC').replace(VI_RE, (m) => m.replace(/ /g, '&nbsp;'));
  }
}

const hasJa = (s: string) => /[\u3040-\u30ff\u3400-\u9fff]/.test(s);

const letters = (x: string) => (x.match(/[\p{L}\p{N}]/gu) ?? []).length;

function bindJa(nodes: TextNode[]) {
  // 화살표 같은 기호만 있는 조각은 건너뛰고, 글자가 있는 마지막 조각을 고른다
  const last = [...nodes].reverse().find((n) => /[\p{L}\p{N}]/u.test(n.rawText));
  if (!last) return;
  const raw = last.rawText;
  // 일본어 페이지 안의 영문(표준 이름 등)은 띄어쓰기 규칙으로
  if (!hasJa(raw)) return bindSpaces(nodes);
  if (raw.includes('<') || /&[a-z#0-9]+;/i.test(raw)) return;
  // 제목(.bx)처럼 이미 구 사이에 <wbr>이 있으면: 마지막 구가 세 글자 이하일 때 그 앞 <wbr>을 지워 앞 구와 붙인다
  const parent = last.parentNode as HTMLElement | null;
  if (parent) {
    const i = parent.childNodes.indexOf(last);
    const prev = parent.childNodes[i - 1];
    if (prev instanceof HTMLElement && prev.rawTagName?.toLowerCase() === 'wbr') {
      if (letters(raw) <= 3) parent.removeChild(prev);
      return;
    }
  }
  const total = letters(nodes.map((n) => n.rawText).join(''));
  if (total < 8) return;
  // 묶을 끝부분: 마지막 구(여덟 글자 이하일 때)와 '끝에서 다섯 글자' 중 긴 쪽.
  // 글자 사이마다 WORD JOINER를 넣어 그 안에서는 줄을 바꾸지 않는다(끝부분 앞에서는 바꿀 수 있다)
  const chars = [...raw];
  let start = chars.length;
  let n = 0;
  while (start > 0 && n < 5) { start--; if (/[\p{L}\p{N}]/u.test(chars[start])) n++; }
  const phrases = ja.parse(raw);
  const lp = phrases[phrases.length - 1] ?? '';
  if (letters(lp) <= 8) start = Math.min(start, chars.length - [...lp].length);
  if (start <= 0) return;
  last.rawText = chars.slice(0, start).join('') + chars.slice(start).join('\u2060');
}

/** 'A · B'의 점 앞 띄어쓰기를 줄바꿈 없는 공백(문자 U+00A0: 일본어 묶음 검사가 &엔티티를 피하므로)으로 */
function bindDots(n: TextNode) {
  if (n.rawText.includes(' · ')) n.rawText = n.rawText.replace(/(?<=\S) · /g, '\u00a0· ');
}

/** 특허·전화번호처럼 숫자-숫자는 하이픈에서 끊기지 않게. 바로 앞에 붙은 괄호와 한글·영문 낱말까지 한 덩어리로 */
function keepNumbers(n: TextNode) {
  if (!/\d-\d/.test(n.rawText)) return;
  n.rawText = n.rawText.replace(/(?:[\p{Script=Hangul}\p{Script=Latin}]{1,12}\(|\()?\d+(?:-\d+)+\)?/gu, '<span class="nb">$&</span>');
}

export function typeset(html: string): string {
  const root = parse(html, { comment: true, blockTextElements: { script: true, style: true, noscript: true, pre: true, textarea: true } });
  const htmlEl = root.querySelector('html');
  const pageLang = (htmlEl?.getAttribute('lang') ?? 'ko').slice(0, 2);
  const walk = (el: HTMLElement, lang: string) => {
    for (const c of el.childNodes as Node[]) {
      if (!(c instanceof HTMLElement)) continue;
      const tag = c.rawTagName?.toLowerCase();
      if (!tag || SKIP.has(tag)) continue;
      const l = (c.getAttribute('lang') ?? lang).slice(0, 2);
      if (isContainer(c) && !c.classList.contains('nw')) {
        const segs = textSegments(c);
        const nodes = segs.flat();
        if (nodes.some((n) => n.rawText.trim())) {
          for (const t of nodes) bindDots(t);
          if (l === 'ja') bindJa(nodes);
          else {
            if (l === 'vi') bindVi(nodes);
            for (const s of segs) bindSpaces(s);
          }
          for (const t of nodes) keepNumbers(t);
        }
      }
      walk(c, l);
    }
  };
  const body = root.querySelector('body');
  if (body) walk(body, pageLang);
  return root.toString();
}
