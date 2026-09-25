/** 데이터 아트 렌더러 공통 모양(캔버스·WebGL) */
export interface ArtBox { x: number; y: number; w: number; h: number }
/** 화면(HTML)에 맞춰 입자가 설 자리: 근거 묶음 옮김(그림 칸 비율), 주인공 자리(무대 기준 0~1) */
export interface ArtAnchors {
  shift?: [number, number];
  /** 장면 2 기록 칸(무대 px) */
  ledger?: ArtBox;
}
export interface Art {
  /** 무대 크기와 그림 칸(무대 기준 px), 화면에 맞춘 자리 */
  resize(stageW: number, stageH: number, box: ArtBox, anchors?: ArtAnchors): void;
  /** 장면 값(0~5) */
  setScene(s: number): void;
  /** 떠다님(자동 움직임) 켜기·끄기: 움직임 멈춤이면 끈다 */
  setAmbient(on: boolean): void;
  /** 실시간 수집에 기록이 올라올 때(무대 px, 활동 종류) */
  emit?(x: number, y: number, verb: number): void;
  destroy(): void;
}
