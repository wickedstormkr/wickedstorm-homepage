/** 데이터 아트 렌더러 공통 모양(캔버스·WebGL) */
export interface ArtBox { x: number; y: number; w: number; h: number }
export interface Art {
  /** 무대 크기와 그림 칸(무대 기준 px). shift: 근거 묶음을 신호 알림 옆으로 옮기는 양(그림 칸 비율) */
  resize(stageW: number, stageH: number, box: ArtBox, shift?: [number, number]): void;
  /** 장면 값(0~5) */
  setScene(s: number): void;
  /** 떠다님(자동 움직임) 켜기·끄기: 움직임 멈춤이면 끈다 */
  setAmbient(on: boolean): void;
  destroy(): void;
}
