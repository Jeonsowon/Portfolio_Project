export type GenerateSummaryReq = {
  title: string;          // ✅ @NotBlank
  role?: string;
  bullets?: string[];
  techs?: string[];
  tone?: string;
};

export interface GenerateSummaryRes {
  summary: string;
}
