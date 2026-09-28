/** 데이터 아트 렌더러 공통 모양(캔버스·WebGL) */
export interface ArtBox { x: number; y: number; w: number; h: number }
/** 화면(HTML)에 맞춰 입자가 설 자리(무대 px) */
export interface ArtAnchors {
  /** 장면 2 기록 칸(무대 px) */
  ledger?: ArtBox;
  /** 장면 4 이상 탐지 화면의 그래프 칸(무대 px) */
  chart?: ArtBox;
  /** 장면 5 근거 문장이 모이는 정사각 알림 아이콘 */
  notification?: ArtBox;
  /** Scene 6 has its own frame, independent of the CASE tree's layout. */
  ring?: ArtBox;
}
export interface Art {
  /** 무대 크기와 그림 칸(무대 기준 px), 화면에 맞춘 자리 */
  resize(stageW: number, stageH: number, box: ArtBox, anchors?: ArtAnchors): void;
  /** 장면 값(0~5) */
  setScene(s: number): void;
  /** 떠다님(자동 움직임) 켜기·끄기: 움직임 멈춤이면 끈다 */
  setAmbient(on: boolean): void;
  /** 실시간 수집 창에 새 문장이 들어와 기록 행 한 줄(0~5)을 다시 쓴다 */
  write?(row: number): void;
  destroy(): void;
}
