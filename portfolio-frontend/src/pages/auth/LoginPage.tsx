// src/pages/auth/LoginPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginApi } from "../../lib/authApi";
import { useAuth } from "../../router/AuthContext"; // ← 경로 확인!
import { setAuthToken } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // 1) 로그인 호출
      const res = await loginApi({ email, password }); // { token, email, name }

      // 2) 토큰 저장 (메모리 + localStorage)
      if (res.token) {
        setToken(res.token);          // AuthContext → localStorage + 메모리 반영(설계대로라면)
        setAuthToken(res.token);      // axios 인터셉터에 즉시 반영(중복 방지하려면 AuthContext 내부에서 호출)
        localStorage.setItem("token", res.token); // 새로고침 대비
      }

      // 3) 사용자 표시용 정보 저장(선택)
      localStorage.setItem(
        "me",
        JSON.stringify({ email: res.email, name: res.name })
      );

      // 4) 라우팅
      navigate("/home");
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-accent-light rounded-lg p-6 w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold text-brand text-center">로그인</h1>
        <input
          className="w-full p-3 border rounded"
          placeholder="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full p-3 border rounded"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          disabled={loading}
          className="w-full py-3 bg-brand text-white rounded hover:bg-brand-light"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
        <div className="text-center text-sm">
          계정이 없으신가요?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            회원가입
          </Link>
        </div>
      </form>
    </div>
  );
}