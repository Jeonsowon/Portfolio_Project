// src/lib/authApi.ts
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export async function registerApi(body: {name:string; email:string; password:string}) {
  const res = await fetch(`${BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{token:string; email:string; name:string}>;
}

export async function loginApi(body: {email:string; password:string}) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{token:string; email:string; name:string}>;
}
