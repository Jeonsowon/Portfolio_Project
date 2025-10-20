// src/lib/portfolioApi.ts
import { api } from "./api";
import type { PortfolioDetail, PortfolioSummary } from "../types/portfolio";

export async function fetchMyPortfolios(): Promise<{
  basic: PortfolioSummary[];
  remodel: PortfolioSummary[];
}> {
  const { data } = await api.get("/api/v1/portfolios/my");
  console.log("[my portfolios raw]", data);

  // 서버가 배열을 주는 경우 → kind별로 분리
  if (Array.isArray(data)) {
    const basic = data.filter((p) => p.kind === "BASIC");
    const remodel = data.filter((p) => p.kind === "REMODEL");
    return { basic, remodel };
  }
  // 서버가 객체 형태면 그대로 사용
  const basic = Array.isArray(data?.basic) ? data.basic : [];
  const remodel = Array.isArray(data?.remodel) ? data.remodel : [];
  return { basic, remodel };
}

export async function getPortfolio(id: number): Promise<PortfolioDetail> {
  const { data } = await api.get(`/api/v1/portfolios/${id}`);
  return data;
}

export async function createDefault(kind: "BASIC" | "REMODEL" = "BASIC") {
  const { data } = await api.post(`/api/v1/portfolios/create-default`, { kind });
  return data as PortfolioDetail;
}

export async function savePortfolio(id: number, dataJson: any) {
  const { data } = await api.put(`/api/v1/portfolios/${id}`, { data: dataJson });
  return data as PortfolioDetail;
}