// src/pages/auth/RegisterPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerApi } from "../../lib/authApi";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await registerApi({ name, email, password });
      alert("회원가입 완료! 로그인 해주세요.");
      navigate("/login");
    } catch (e: any) {
      alert(e?.message || "회원가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-white border border-accent-light rounded-lg p-6 w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-brand text-center">회원가입</h1>
        <input className="w-full p-3 border rounded" placeholder="이름" value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full p-3 border rounded" placeholder="이메일" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full p-3 border rounded" placeholder="비밀번호" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={loading} className="w-full py-3 bg-brand text-white rounded hover:bg-brand-light">
          {loading ? "가입 중..." : "가입하기"}
        </button>
        <div className="text-center text-sm">
          이미 계정이 있으신가요? <Link to="/login" className="text-blue-600 hover:underline">로그인</Link>
        </div>
      </form>
    </div>
  );
}
