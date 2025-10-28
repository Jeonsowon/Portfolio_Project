// src/lib/remodelApi.ts
import type { RemodelBuildRes } from "../types/remodel";

type BasicItem = { id: number; kind: "BASIC" | "REMODEL"; title: string; updatedAt: string };

const getToken = () => localStorage.getItem("token") ?? undefined;

// 매 요청 시점에 Authorization 헤더를 만들어 줍니다.
const authHeaders = (): Record<string, string> => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/** 기본 포트폴리오 목록 (BASIC만) */
export async function fetchBasicPortfolios(): Promise<BasicItem[]> {
  const res = await fetch("/api/v1/portfolios/my", {
    headers: {
      ...authHeaders(),
    },
  });

  const text = await res.text();
  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} - ${text.slice(0, 300)}`);
  }
  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got ${ct}. Body: ${text.slice(0, 300)}`);
  }

  const arr = JSON.parse(text) as BasicItem[] | { basic?: BasicItem[]; remodel?: BasicItem[] };

  const list: BasicItem[] = Array.isArray(arr)
    ? arr
    : Array.isArray(arr.basic)
    ? arr.basic
    : [];

  return list.filter((x) => x.kind === "BASIC");
}

/** 리모델 포트폴리오 생성 */
export async function buildRemodel(payload: {
  basePortfolioId: number;
  sourceType: "url" | "text";
  value: string;
  title?: string;
}): Promise<RemodelBuildRes> {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };

  const res = await fetch("/api/v1/remodel/build", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  console.log("[remodel] payload", payload);  // 디버그용

  const text = await res.text();
  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  }
  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON but got ${ct}. Body: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as RemodelBuildRes;
}