// src/pages/RemodelFormPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBasicPortfolios, buildRemodel } from "../lib/remodelApi";

type BasicItem = { id: number; kind: "BASIC" | "REMODEL"; title: string; updatedAt: string };

const RemodelFormPage: React.FC = () => {
  const nav = useNavigate();

  const [basics, setBasics] = useState<BasicItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [url, setUrl] = useState("");

  const [title, setTitle] = useState(""); // 결과물 이름
  const [loading, setLoading] = useState(false);
  // 미리보기로 즉시 이동하므로 결과 상태는 보관하지 않음

  useEffect(() => {
    fetchBasicPortfolios()
      .then((list) => {
        setBasics(list);
        if (list.length) setSelectedId(list[0].id);
      })
      .catch((e) => alert(e.message));
  }, []);

  const onBuild = async () => {
    try {
      if (!selectedId) return alert("기본 포트폴리오를 선택하세요.");
      const value = url.trim();
      if (!value) return alert("채용공고 URL을 입력하세요.");

      setLoading(true);
      const res = await buildRemodel({
        basePortfolioId: selectedId,
        sourceType: "url",
        value,
        title: title.trim() || undefined,
      });
      // 제작 완료 후 바로 미리보기로 이동
      nav("/preview", { state: { id: res.id, kind: "REMODEL" } });
    } catch (e: any) {
      alert(e?.message ?? "제작 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">맞춤형 포트폴리오 생성</h1>

      {/* 1) 기본 포트폴리오 선택 */}
      <div className="bg-white border rounded p-4 mb-6">
        <div className="font-semibold mb-2">기본 포트폴리오 선택</div>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="w-full p-3 border rounded"
        >
          {basics.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || `포트폴리오 #${p.id}`}
            </option>
          ))}
        </select>
      </div>

      {/* 2) 공고 입력 (URL만) */}
      <div className="bg-white border rounded p-4 mb-6">
        <div className="font-semibold mb-2">채용공고 입력</div>
        <input
          type="url"
          placeholder="채용공고 URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-3 border rounded"
        />
      </div>

      {/* 3) 결과물 기본 정보 */}
      <div className="bg-white border rounded p-4 mb-6">
        <div className="font-semibold mb-2">결과물 기본 정보</div>
        <input
          type="text"
          placeholder="제목 입력"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border rounded"
        />
      </div>

      <div className="flex justify-end gap-2 mb-8">
        <button
          onClick={() => nav("/home")}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        >
          취소
        </button>
        <button
          onClick={onBuild}
          disabled={loading}
          className="px-4 py-2 rounded bg-brand text-white hover:bg-brand-light disabled:opacity-60"
        >
          {loading ? "제작 중…" : "제작"}
        </button>
      </div>

      {/* 제작 후 즉시 Preview로 이동하므로 결과 블록은 제거 */}
    </div>
  );
};

export default RemodelFormPage;