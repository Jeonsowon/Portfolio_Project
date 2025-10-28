// src/types/Remodel.ts
export type SourceType = "url" | "text";

export interface BuildRemodelReq {
  basePortfolioId: number;
  sourceType: SourceType;     // "url" | "text"
  value: string;              // 공고 URL 또는 텍스트
  title?: string;             // (선택) 리모델링 결과 제목
}

export interface RemodelBuildRes {
  id: number;                 // 저장된 리모델링 포트폴리오 ID
  kind: "REMODEL";
  data: import("./PortfolioData").PortfolioData;
  createdAt?: string;
  title?: string;
}

// 홈 화면 요약용
export interface RemodelSummary {
  id: number;
  kind: "BASIC" | "REMODEL";
  title?: string;
  role?: string;
  updatedAt?: string;
}