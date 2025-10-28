// src/pages/RemodelFormPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBasicPortfolios, buildRemodel } from "../lib/remodelApi";
import type { RemodelSummary } from "../types/remodel";

const RemodelFormPage: React.FC = () => {
  const nav = useNavigate();

  const [basics, setBasics] = useState<RemodelSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");

  const [title, setTitle] = useState(""); // 결과물 이름
  const [loading, setLoading] = useState(false);
  const [resultId, setResultId] = useState<number | null>(null);
  const [resultJson, setResultJson] = useState<string>("");

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
      const value = mode === "url" ? url.trim() : rawText.trim();
      if (!value) return alert("채용공고 URL 또는 텍스트를 입력하세요.");

      setLoading(true);
      const res = await buildRemodel({
        basePortfolioId: selectedId,
        sourceType: mode,
        value,
        title: title.trim() || undefined,
      });

      setResultId(res.id);
      setResultJson(JSON.stringify(res.data, null, 2));
      alert("리모델링 포트폴리오가 저장되었습니다.");
    } catch (e: any) {
      alert(e?.message ?? "제작 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">리모델링 생성</h1>

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
              {p.title || `포트폴리오 #${p.id}`} {p.role ? ` · ${p.role}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* 2) 공고 입력 (URL/텍스트) */}
      <div className="bg-white border rounded p-4 mb-6">
        <div className="font-semibold mb-2">채용공고 입력</div>
        <div className="flex gap-3 mb-3">
          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === "url"} onChange={() => setMode("url")} />
            <span>URL</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === "text"} onChange={() => setMode("text")} />
            <span>텍스트</span>
          </label>
        </div>

        {mode === "url" ? (
          <input
            type="url"
            placeholder="채용공고 URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-3 border rounded"
          />
        ) : (
          <textarea
            placeholder="채용공고 텍스트 붙여넣기"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full p-3 border rounded min-h-[160px]"
          />
        )}
      </div>

      {/* 3) 결과물 기본 정보 */}
      <div className="bg-white border rounded p-4 mb-6">
        <div className="font-semibold mb-2">결과물 기본 정보</div>
        <input
          type="text"
          placeholder="리모델링 제목(선택)"
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

      {/* 4) 결과 미리보기 (저장은 백엔드에서 이미 완료) */}
      {resultId && (
        <div className="bg-gray-50 border rounded p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">생성 결과 (저장됨)</div>
            <div className="flex gap-2">
              <button
                onClick={() => nav("/preview", { state: { id: resultId, kind: "REMODEL" } })}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                미리보기
              </button>
              <button
                onClick={() => nav("/edit", { state: { id: resultId, kind: "REMODEL" } })}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                편집
              </button>
            </div>
          </div>
          <pre className="text-xs whitespace-pre-wrap">{resultJson}</pre>
        </div>
      )}
    </div>
  );
};

export default RemodelFormPage;