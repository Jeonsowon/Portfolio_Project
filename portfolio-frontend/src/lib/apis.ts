// src/lib/apis.ts
import type { GenerateSummaryReq } from "../types/api";

export async function generateSummary(req: GenerateSummaryReq) {
  const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
  const token = localStorage.getItem("token");

  const res = await fetch(`${base}/api/v1/generate-summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`generate-summary 실패 (${res.status}) ${text}`);
  }
  return res.json();
}