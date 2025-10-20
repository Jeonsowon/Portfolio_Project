import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  withCredentials: false, // Bearer 사용이므로 쿠키 불필요
});

// ── 메모리 토큰 (인터셉터에서 사용)
let inMemoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
};

// 앱 시작 시 localStorage에서 토큰 주입 (선택)
export const hydrateAuthToken = () => {
  const t = localStorage.getItem("token");
  if (t) setAuthToken(t);
};

// ── 요청 인터셉터: Authorization 자동 첨부
api.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

// ── 응답 인터셉터: 401이면 토큰 제거/로그인 유도
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      setAuthToken(null);
      // 필요하면: window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
