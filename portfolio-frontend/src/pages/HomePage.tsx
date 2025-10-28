// src/pages/HomePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchMyPortfolios,
  getPortfolio,
  createDefault,
  deletePortfolio,
} from "../lib/portfolioApi";
import type { PortfolioSummary, PortfolioDetail } from "../types/portfolio";
import { useAuth } from "../router/AuthContext";
import { setAuthToken } from "../lib/api";

// 홈에서 사용할 그룹 타입
type MyPortfolios = { basic: PortfolioSummary[]; remodel: PortfolioSummary[] };

export default function HomePage() {
  const { ready, setToken } = useAuth();
  const navigate = useNavigate();

  // ✅ 단일 상태만 사용 (lists/items 중복 제거)
  const [items, setItems] = useState<MyPortfolios>({ basic: [], remodel: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        // fetchMyPortfolios가 배열([]) 또는 {basic, remodel} 둘 다 올 수 있다고 가정하고 안전하게 처리
        const raw: any = await fetchMyPortfolios();

        let grouped: MyPortfolios;
        if (Array.isArray(raw)) {
          grouped = {
            basic: raw.filter((x) => x.kind === "BASIC"),
            remodel: raw.filter((x) => x.kind === "REMODEL"),
          };
        } else {
          grouped = {
            basic: Array.isArray(raw.basic) ? raw.basic : [],
            remodel: Array.isArray(raw.remodel) ? raw.remodel : [],
          };
        }
        setItems(grouped);
      } catch (e: any) {
        // 빈 목록은 에러 아님. 진짜 요청 실패만 노출
        setLoadError(
          e?.response?.data?.message ||
            e?.message ||
            "목록을 불러오는 중 오류가 발생했습니다."
        );
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
      if (kind === "REMODEL") {
        // ✅ 리모델링은 생성 폼으로 보냄
        navigate("/remodel/new");
        return;
      }
      // ✅ 기본 포트폴리오는 서버에서 템플릿 발급 후 폼으로 이동
      const created: PortfolioDetail = await createDefault(kind);
      navigate("/form", { state: created });
    } catch (e: any) {
      alert(e?.response?.data?.message || "생성 실패");
    }
  }

  async function goEdit(id: number) {
    try {
      const detail = await getPortfolio(id);
      navigate("/form", { state: detail });
    } catch (e: any) {
      alert(e?.response?.data?.message || "불러오기 실패");
    }
  }

  async function goView(id: number) {
    try {
      const detail = await getPortfolio(id);
      navigate("/preview", { state: detail });
    } catch (e: any) {
      alert(e?.response?.data?.message || "불러오기 실패");
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("정말 이 포트폴리오를 삭제하시겠습니까?")) return;

    try {
      await deletePortfolio(id);
      // ✅ 두 섹션에서 모두 제거
      setItems((prev) => ({
        basic: prev.basic.filter((p) => p.id !== id),
        remodel: prev.remodel.filter((p) => p.id !== id),
      }));
    } catch (e: any) {
      alert(e?.response?.data?.message || "삭제 실패");
    }
  }

  if (!ready) return <div className="p-8 text-center text-gray-500">초기화 중…</div>;
  if (loading) return <div className="p-8 text-center text-gray-500">불러오는 중…</div>;

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white border border-accent-light rounded-lg p-6">
          <p className="text-red-600 font-medium mb-3">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const isEmpty = items.basic.length === 0 && items.remodel.length === 0;

  function Section({
    title,
    list,
    kind,
  }: {
    title: string;
    list: PortfolioSummary[];
    kind: "BASIC" | "REMODEL";
  }) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 border border-accent-light">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-brand">{title}</h2>
          <button
            onClick={() => goCreate(kind)}
            className="px-3 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            + {kind === "BASIC" ? "기본 포트폴리오 생성" : "리모델링 생성"}
          </button>
        </div>

        {list.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border rounded-lg p-3"
              >
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-500">
                    업데이트: {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "-"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goEdit(p.id)}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => goView(p.id)}
                    className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  >
                    보기
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    삭제
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
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm transition"
        >
          로그아웃
        </button>
      </div>

      {isEmpty ? (
        <div className="bg-white border border-accent-light rounded-lg p-10 text-center">
          <h2 className="text-xl font-semibold text-brand mb-2">포트폴리오가 없습니다</h2>
          <p className="text-gray-600 mb-6">새 포트폴리오를 만들어 시작해 보세요.</p>
          <button
            onClick={() => goCreate("BASIC")}
            className="px-5 py-3 bg-brand text-white rounded-lg hover:bg-brand-light"
          >
            + 기본 포트폴리오 생성
          </button>
        </div>
      ) : (
        <>
          <Section title="기본 포트폴리오" list={items.basic} kind="BASIC" />
          <Section title="리모델링 포트폴리오" list={items.remodel} kind="REMODEL" />
        </>
      )}
    </div>
  );
}