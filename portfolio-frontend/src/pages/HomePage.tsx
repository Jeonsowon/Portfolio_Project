// src/pages/HomePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyPortfolios, getPortfolio, createDefault } from "../lib/portfolioApi";
import type { PortfolioSummary, PortfolioDetail } from "../types/portfolio";
import { useAuth } from "../router/AuthContext";
import { setAuthToken } from "../lib/api";

export default function HomePage() {
  const { ready, setToken } = useAuth();
  const navigate = useNavigate();

  const [lists, setLists] = useState<{ basic: PortfolioSummary[]; remodel: PortfolioSummary[] }>({
    basic: [],
    remodel: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { basic, remodel } = await fetchMyPortfolios();
        setLists({ basic, remodel });
      } catch (e: any) {
        // 빈 목록은 에러 아님. 진짜 요청 실패만 노출
        setLoadError(e?.response?.data?.message || e?.message || "목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("me");
    setToken(null);
    setAuthToken(null);
    navigate("/login");
  };

  async function goCreate(kind: "BASIC" | "REMODEL") {
    try {
      const created: PortfolioDetail = await createDefault(kind);
      navigate("/form", { state: created.data });
    } catch (e: any) {
      alert(e?.response?.data?.message || "생성 실패");
    }
  }

  async function goEdit(id: number) {
    try {
      const detail = await getPortfolio(id);
      navigate("/form", { state: detail.data });
    } catch (e: any) {
      alert(e?.response?.data?.message || "불러오기 실패");
    }
  }

  async function goView(id: number) {
    try {
      const detail = await getPortfolio(id);
      navigate("/preview", { state: detail.data });
    } catch (e: any) {
      alert(e?.response?.data?.message || "불러오기 실패");
    }
  }

  if (!ready) return <div className="p-8 text-center text-gray-500">초기화 중…</div>;
  if (loading) return <div className="p-8 text-center text-gray-500">불러오는 중…</div>;

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white border border-accent-light rounded-lg p-6">
          <p className="text-red-600 font-medium mb-3">{loadError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const isEmpty =
    !Array.isArray(lists.basic) || lists.basic.length === 0
      ? !Array.isArray(lists.remodel) || lists.remodel.length === 0
      : false;

  function Section({
    title,
    items,
    kind,
  }: {
    title: string;
    items: PortfolioSummary[] | undefined;
    kind: "BASIC" | "REMODEL";
  }) {
    const safeItems = Array.isArray(items) ? items : [];
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 border border-accent-light">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-brand">{title}</h2>
          <button onClick={() => goCreate(kind)} className="px-3 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300">
            + {kind === "BASIC" ? "기본 포트폴리오 생성" : "리모델링 생성"}
          </button>
        </div>

        {safeItems.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {safeItems.map((p) => (
              <li key={p.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-500">
                    업데이트: {new Date(p.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => goEdit(p.id)} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
                    수정
                  </button>
                  <button onClick={() => goView(p.id)} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
                    보기
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-background min-h-screen space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-brand">내 포트폴리오</h1>
        <button onClick={handleLogout} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm transition">
          로그아웃
        </button>
      </div>

      {isEmpty ? (
        <div className="bg-white border border-accent-light rounded-lg p-10 text-center">
          <h2 className="text-xl font-semibold text-brand mb-2">포트폴리오가 없습니다</h2>
          <p className="text-gray-600 mb-6">새 포트폴리오를 만들어 시작해 보세요.</p>
          <button onClick={() => navigate("/form")} className="px-5 py-3 bg-brand text-white rounded-lg hover:bg-brand-light">
            + 기본 포트폴리오 생성
          </button>
        </div>
      ) : (
        <>
          <Section title="기본 포트폴리오" items={lists.basic} kind="BASIC" />
          <Section title="리모델링 포트폴리오" items={lists.remodel} kind="REMODEL" />
        </>
      )}
    </div>
  );
}