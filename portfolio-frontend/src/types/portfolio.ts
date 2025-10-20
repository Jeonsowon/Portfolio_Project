export type PortfolioKind = "BASIC" | "REMODEL";

export type PortfolioSummary = {
  id: number;
  kind: PortfolioKind;
  title: string;          // 리스트 제목용 (예: name/role 조합)
  updatedAt: string;
};

export type PortfolioDetail = {
  id: number;
  kind: PortfolioKind;
  data: any;              // 기존 PortfolioData 형태(JSON) 그대로
};

export type RawPortfolioItem = {
  id: number | string;
  kind?: "BASIC" | "REMODEL";
  type?: "BASIC" | "REMODEL";     // 혹시 서버에서 type으로 올 수도
  title?: string;
  name?: string;                  // 혹시 name으로 올 수도
  updatedAt?: string;
  updated_at?: string;            // snake_case일 수도
};