// src/lib/apis.ts
import type { GenerateSummaryReq } from "../types/api";

export async function generateSummary(req: GenerateSummaryReq) {
  const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
  const token = localStorage.getItem("token");

  console.log("[AI] call generate-summary", { hasToken: !!token });

  const res = await fetch(`${base}/api/v1/generate-summary`, {
    method: "POST",
    mode: "cors",
    // ✅ 리다이렉트 자동추적 금지(수동 확인). 만약 서버가 302/307을 주면 여기서 걸러짐
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  });

  // 리다이렉트면 그대로 에러를 내서, “왜 리다이렉트 됐는지”를 알 수 있게 함
  if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
    throw new Error(`generate-summary 리다이렉트 감지: ${res.status}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`generate-summary 실패 (${res.status}) ${text}`);
  }
  return res.json();
}