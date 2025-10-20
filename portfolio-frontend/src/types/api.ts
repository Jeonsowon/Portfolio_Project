export interface GenerateSummaryReq {
  name: string;
  role: string;
  introduction: string;
  skills: string[]; // 스킬 이름만
  projects: { title: string; description: string; link?: string }[];
}

export interface GenerateSummaryRes {
  summary: string;
}
