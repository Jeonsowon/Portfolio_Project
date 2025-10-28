import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { PortfolioData } from "../types/PortfolioData";
import { CONTACT_OPTIONS } from "../data/contactOptions";
import { HiViewGrid, HiViewList, HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { getPortfolio } from "../lib/portfolioApi";
// html2canvas/jspdf 제거됨 (인쇄 기반 사용)

/* ---------- utils ---------- */
function formatDate(d?: string) {
  if (!d) return "";
  try {
    const date = new Date(d.length === 7 ? `${d}-01` : d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString();
  } catch {
    return d;
  }
}

function autolink(value: string) {
  if (!value) return "";
  const v = value.trim();
  if (v.startsWith("mailto:") || v.startsWith("tel:") || v.startsWith("http")) return v;
  if (v.includes("@")) return `mailto:${v}`;
  if (v.replace(/[\s\-]/g, "").match(/^0\d{8,}$/)) return `tel:${v}`;
  if (/^\w+\.\w+/.test(v)) return `https://${v}`;
  return v;
}

/* ---------- types & constants ---------- */
type LocationState =
  | { id?: number; kind?: "BASIC" | "REMODEL"; data?: PortfolioData }
  | undefined;

const DRAFT_KEY = (id?: number | null) => `pf:draft:${id ?? "new"}`;

/* ---------- Section UI ---------- */
function Section({
  title,
  children,
  className = "",
}: {
  title: React.ReactNode; // ← JSX 허용
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white shadow-sm rounded-lg p-6 mb-12 border border-accent-light ${className}`}>
      <h2 className="text-2xl font-semibold mb-4 text-brand">{title}</h2>
      {children}
    </section>
  );
}

/* ---------- Page ---------- */
const PreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const pageRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [imageIndex, setImageIndex] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [loadedData, setLoadedData] = useState<PortfolioData | null>(null);

  // 쿼리스트링 id 지원
  const params = new URLSearchParams(location.search);
  const queryIdRaw = params.get("id");
  const queryId = queryIdRaw ? Number(queryIdRaw) : undefined;
  const effectiveId = state?.id ?? (Number.isFinite(queryId) ? (queryId as number) : undefined);

  // 1순위: state.data, 2순위: sessionStorage draft (id 기준)
  const fallbackRaw = sessionStorage.getItem(DRAFT_KEY(effectiveId ?? null));
  const fallback: PortfolioData | null = fallbackRaw ? JSON.parse(fallbackRaw) : null;

  // 필요한 경우 서버에서 상세 데이터 로드 (id만 전달된 경우)
  useEffect(() => {
    if (!state?.data && effectiveId) {
      setLoading(true);
      getPortfolio(effectiveId)
        .then((detail) => {
          setLoadedData(detail.data as unknown as PortfolioData);
        })
        .catch(() => {
          setLoadedData(null);
        })
        .finally(() => setLoading(false));
    }
  }, [effectiveId, state?.data]);

  const data: PortfolioData =
    state?.data ??
    loadedData ??
    fallback ?? {
      name: "",
      role: "",
      contacts: [],
      introduction: "",
      skills: [],
      experiences: [],
      projects: [],
      educations: [],
      certifications: [],
      awards: [],
    };

  // (삭제) html2canvas 인라인 처리

  const hasAny =
    !!data.name ||
    !!data.role ||
    data.contacts.length > 0 ||
    !!data.introduction ||
    data.skills.length > 0 ||
    data.experiences.length > 0 ||
    data.projects.length > 0 ||
    data.educations.length > 0 ||
    data.certifications.length > 0 ||
    data.awards.length > 0;

  const goBackToEdit = () => {
    navigate("/form", {
      state: {
        id: effectiveId,
        kind: state?.kind ?? "BASIC",
        data,
      },
    });
  };
  // (삭제) PDF 다운로드 생성 로직

  // QR 기능 제거됨

  // 이미지 좌우 이동
  const handleNextImage = (projectIndex: number, total: number) => {
    setImageIndex((prev) => {
      const current = prev[projectIndex] ?? 0;
      return { ...prev, [projectIndex]: (current + 1) % total };
    });
  };
  const handlePrevImage = (projectIndex: number, total: number) => {
    setImageIndex((prev) => {
      const current = prev[projectIndex] ?? 0;
      return { ...prev, [projectIndex]: (current - 1 + total) % total };
    });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-8 min-h-screen flex items-center justify-center text-gray-600">
        불러오는 중…
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="max-w-3xl mx-auto p-8 min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-600 mb-6">미리보기할 데이터가 없습니다.</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-3 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            뒤로가기
          </button>
          <button
            onClick={() => navigate("/home")}
            className="px-5 py-3 bg-brand text-white rounded-lg hover:bg-brand-light"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    try {
      window.scrollTo(0, 0);
      setTimeout(() => window.print(), 50);
    } catch {
      alert("인쇄(PDF 저장) 기능 실행 중 오류가 발생했습니다.");
    }
  };

  return (
    <div ref={pageRef} className="print-area max-w-4xl mx-auto p-8 bg-background min-h-screen font-sans">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-brand mb-2">{data.name || "이름 미입력"}</h1>
        <p className="text-lg text-accent mb-4">{data.role || "직무/역할"}</p>

        {/* 연락처 */}
        {!!data.contacts.length && (
          <div className="flex flex-wrap justify-center gap-3">
            {data.contacts.map((c, index) => {
              const option = CONTACT_OPTIONS.find((o) => o.type === c.type);
              const href = autolink(c.value);
              const isMail = href.startsWith("mailto:");
              return (
                <a
                  key={index}
                  href={href}
                  target={isMail ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-brand rounded-lg border border-accent-light hover:bg-gray-200 transition max-w-[260px]"
                >
                  {option && (
                    <span className="w-5 h-5 inline-flex items-center justify-center">
                      <img src={option.icon} alt={c.type} className="w-full h-full object-contain" />
                    </span>
                  )}
                  <span className="truncate">{c.value}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* 소개 */}
      {data.introduction && (
        <Section title="Introduction">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {data.introduction}
          </p>
        </Section>
      )}

      {/* Skills */}
      {!!data.skills.length && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-4">
            {data.skills.map((skill, index) => (
              <div key={index} className="flex items-center gap-2">
                {skill.icon ? (
                  <span className="w-6 h-6 rounded-full bg-white border inline-flex items-center justify-center overflow-hidden">
                    <img src={skill.icon} alt={skill.name} className="w-full h-full object-contain" />
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-gray-200 grid place-items-center text-[10px]">
                    {skill.name.slice(0, 2)}
                  </span>
                )}
                <span>{skill.name}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {!!data.educations.length && (
        <Section title="학력">
          <div className="space-y-4">
            {data.educations.map((e, i) => (
              <div key={i}>
                <div className="font-semibold">{e.school}</div>
                <div className="text-sm text-gray-600">
                  {[e.degree, e.major].filter(Boolean).join(" · ")}
                  {(e.start || e.end) && (
                    <span className="ml-2">({[e.start, e.end].filter(Boolean).join(" ~ ")})</span>
                  )}
                </div>
                {e.description && (
                  <p className="mt-2 whitespace-pre-wrap">{e.description}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Experience */}
      <Section title="Experience">
        {data.experiences?.length ? (
          data.experiences.map((exp, idx) => (
            <div key={idx} className="border rounded-lg p-4 mb-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">{exp.company}</h3>
                <p className="text-gray-500 text-sm">{exp.period}</p>
              </div>
              <p className="text-brand font-medium mt-1">{exp.position}</p>
              {exp.description && (
                <p className="text-gray-700 mt-2 whitespace-pre-line">{exp.description}</p>
              )}
              {!!exp.techs?.length && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {exp.techs.map((tech, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-xs">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500">등록된 경험이 없습니다.</p>
        )}
      </Section>

      {/* Certifications (url 제거) */}
      {!!data.certifications.length && (
        <Section title="자격증">
          <ul className="space-y-3">
            {data.certifications.map((c, i) => (
              <li key={i} className="border rounded-lg p-3">
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-gray-600">
                  {[c.issuer, formatDate(c.date)].filter(Boolean).join(" · ")}
                  {c.expires && ` · 만료 ${formatDate(c.expires)}`}
                </div>
                {c.credentialId && (
                  <div className="text-sm text-gray-600">자격번호: {c.credentialId}</div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Awards */}
      {!!data.awards.length && (
        <Section title="수상 경력">
          <ul className="space-y-3">
            {data.awards.map((a, i) => (
              <li key={i} className="border rounded-lg p-3">
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-gray-600">
                  {[a.issuer, formatDate(a.date)].filter(Boolean).join(" · ")}
                </div>
                {a.description && <p className="mt-2 whitespace-pre-wrap">{a.description}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Projects */}
      {!!data.projects.length && (
        <Section
          title={
            <div className="flex items-center justify-between">
              <span>Projects</span>
              <button
                onClick={() => setViewMode((p) => (p === "grid" ? "list" : "grid"))}
                className="p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                title={viewMode === "grid" ? "리스트 보기" : "그리드 보기"}
              >
                {viewMode === "grid" ? (
                  <HiViewList className="w-6 h-6 text-brand" />
                ) : (
                  <HiViewGrid className="w-6 h-6 text-brand" />
                )}
              </button>
            </div>
          }
        >
          <div className={viewMode === "grid" ? "grid md:grid-cols-2 gap-6" : "flex flex-col gap-6"}>
            {data.projects.map((project, index) => {
              const totalImages = project.images?.length || 0;
              const currentIndex = imageIndex[index] ?? 0;

              return (
                <div
                  key={index}
                  className="flex flex-col rounded-lg p-6 border border-accent-light bg-white hover:shadow-md transition"
                >
                  {/* 이미지 */}
                  {!!totalImages && (
                    <div className="relative mb-4">
                      {viewMode === "grid" ? (
                        <div className="relative w-full overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={project.images![currentIndex]}
                            alt={`${project.title}-${currentIndex}`}
                            className="w-full h-48 md:h-56 object-contain"
                            loading="lazy"
                          />
                          {totalImages > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePrevImage(index, totalImages)}
                                className="absolute top-50% top-1/2 left-2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60"
                              >
                                <HiChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleNextImage(index, totalImages)}
                                className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60"
                              >
                                <HiChevronRight className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {project.images!.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt={`${project.title}-${i}`}
                              className="w-full h-72 md:h-80 object-contain rounded-lg border bg-gray-100"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <h3 className="text-xl font-bold mb-2">{project.title || "프로젝트"}</h3>

                  {/* 팀 / 역할 / 기여 */}
                  <div className="space-y-2 mb-4">
                    {(project.teamSize || project.myRole) && (
                      <div className="text-sm text-gray-700">
                        {project.teamSize ? <span className="mr-3">👥 팀 규모: {project.teamSize}명</span> : null}
                        {project.myRole ? <span>🛠️ 내 역할: {project.myRole}</span> : null}
                      </div>
                    )}

                    {!!project.contributions?.length && (
                      <ul className="list-disc pl-5 text-gray-700">
                        {project.contributions.map((c, i) => (
                          <li key={i} className="leading-relaxed">{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* 본문 */}

                  {project.description && (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                      {project.description}
                    </p>
                  )}

                  {!!project.techs?.length && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.techs.map((tech, i) => (
                        <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-brand rounded-full">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {project.link && (
                    <a
                      href={autolink(project.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline mt-auto"
                    >
                      View Project →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* 하단 가운데 버튼 */}
      <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur border-t no-print">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/home")}
              className="bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300"
            >
              홈으로
            </button>
            <button
              onClick={handlePrint}
              className="bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300"
            >
              PDF 저장
            </button>
            <button
              onClick={goBackToEdit}
              className="bg-brand text-white px-8 py-3 rounded-lg hover:bg-brand-light transition shadow-md"
            >
              편집하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPage;