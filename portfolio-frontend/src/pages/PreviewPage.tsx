import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import type { PortfolioData } from "../types/PortfolioData";
import { CONTACT_OPTIONS } from "../data/contactOptions";
import { HiViewGrid, HiViewList, HiChevronLeft, HiChevronRight } from "react-icons/hi";

const PreviewPage = () => {
  const location = useLocation();
  const data = location.state as PortfolioData;
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [imageIndex, setImageIndex] = useState<{ [key: number]: number }>({});

  if (!data) {
    return <div>No portfolio data provided.</div>;
  }

  // 이미지 좌우 이동 함수
  const handleNextImage = (projectIndex: number, total: number) => {
    setImageIndex((prev) => {
      const current = prev[projectIndex] ?? 0;      // ← undefined면 0
      return { ...prev, [projectIndex]: (current + 1) % total };
    });
  };

  const handlePrevImage = (projectIndex: number, total: number) => {
    setImageIndex((prev) => {
      const current = prev[projectIndex] ?? 0;      // ← undefined면 0
      return { ...prev, [projectIndex]: (current - 1 + total) % total };
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-background min-h-screen font-sans">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-brand mb-2">{data.name}</h1>
        <p className="text-lg text-accent mb-4">{data.role}</p>

        {/* 연락처 */}
        <div className="flex flex-wrap justify-center gap-3">
          {data.contacts.map((c, index) => {
            const option = CONTACT_OPTIONS.find((o) => o.type === c.type);
            return (
              <a
                key={index}
                href={c.type === "email" ? `mailto:${c.value}` : c.value}
                target={c.type === "email" ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-2 text-sm bg-gray-100 text-brand rounded-lg border border-accent-light hover:bg-gray-200 transition"
              >
                {option && (
                  <img src={option.icon} alt={c.type} className="w-5 h-5" />
                )}
                {c.value}
              </a>
            );
          })}
        </div>
      </div>

      {/* 자기소개 */}
      {data.introduction && (
        <div className="bg-white shadow-sm rounded-lg p-6 mb-12 border border-accent-light">
          <h2 className="text-2xl font-semibold mb-4 text-brand">Introduction</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {data.introduction}
          </p>
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg p-6 mb-12 border border-accent-light">
          <h2 className="text-2xl font-semibold mb-4 text-brand">Skills</h2>
          <div className="flex flex-wrap gap-4 mb-4">
            {data.skills.map((skill, index) => (
              <div key={index} className="flex flex-col items-center">
                {skill.icon ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden shadow-md">
                    <img
                      src={skill.icon}
                      alt={skill.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 shadow-md">
                    <span className="text-xs text-brand">{skill.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-brand">Experience</h2>
        {data.experiences?.length ? (
          data.experiences.map((exp, idx) => (
            <div key={idx} className="border rounded-lg p-4 mb-4 shadow-sm bg-white">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">{exp.company}</h3>
                <p className="text-gray-500 text-sm">{exp.period}</p>
              </div>
              <p className="text-brand font-medium mt-1">{exp.position}</p>
              <p className="text-gray-700 mt-2 whitespace-pre-line">{exp.description}</p>

              {exp.techs?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {exp.techs.map((tech, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm"
                    >
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
      </div>

      {/* Projects */}
      {data.projects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-brand">Projects</h2>
            <button
              onClick={() =>
                setViewMode((prev) => (prev === "grid" ? "list" : "grid"))
              }
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

          <div
            className={
              viewMode === "grid"
                ? "grid md:grid-cols-2 gap-6"
                : "flex flex-col gap-6"
            }
          >
            {data.projects.map((project, index) => {
              const totalImages = project.images?.length || 0;
              const currentIndex = imageIndex[index] ?? 0;

              return (
                <div
                  key={index}
                  className="flex flex-col bg-white shadow-md rounded-lg p-6 border border-accent-light hover:shadow-lg transition"
                >
                  {/* ✅ 이미지 표시 */}
                  {project.images && project.images.length > 0 && (
                    <div className="relative mb-4">
                      {/* 단일 이미지 or 슬라이드 */}
                      {viewMode === "grid" ? (
                        <div className="relative w-full overflow-hidden rounded-lg">
                          <img
                            src={project.images[currentIndex]}
                            alt={`${project.title}-${currentIndex}`}
                            className="w-full h-48 md:h-56 object-cover"
                            loading="lazy"
                            sizes="(min-width: 768px) 560px, 100vw"
                          />

                          {totalImages > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePrevImage(index, totalImages)}
                                className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          {project.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt={`${project.title}-${i}`}
                              className="w-full h-72 md:h-80 object-cover rounded-lg border border-gray-200 shadow-sm"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 프로젝트 정보 */}
                  <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                  <p className="text-gray-700 leading-relaxed flex-1 whitespace-pre-line mb-4">
                    {project.description}
                  </p>

                  {/* 기술 태그 */}
                  {project.techs && project.techs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.techs.map((tech, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs bg-gray-200 text-brand rounded-full"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 링크 */}
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline mt-auto"
                    >
                      View Project →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewPage;