// src/pages/FormPage.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { PortfolioData, Contact } from "../types/PortfolioData";
import { CONTACT_OPTIONS } from "../data/contactOptions";
import { DEVICON_SKILLS } from "../data/deviconSkills";
import { generateSummary } from "../lib/apis";
import type { GenerateSummaryReq } from "../types/api";
import { createDefault, savePortfolio } from "../lib/portfolioApi";

// ------ utils: blob URL 정리 ------
const isBlobUrl = (u: unknown): u is string =>
  typeof u === "string" && u.startsWith("blob:");

const revokeUrl = (u?: string | null): void => {
  if (isBlobUrl(u)) {
    URL.revokeObjectURL(u);
  }
};

// 라우팅으로 넘어오는 데이터 타입
type LocationState =
  | { id?: number; kind?: "BASIC" | "REMODEL"; data?: PortfolioData }
  | undefined;

const FormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || undefined;

  const [portfolioId, setPortfolioId] = useState<number | null>(state?.id ?? null);
  const [kind, setKind] = useState<"BASIC" | "REMODEL">(state?.kind ?? "BASIC");

  const [formData, setFormData] = useState<PortfolioData>({
    name: "",
    role: "",
    contacts: [],
    introduction: "",
    skills: [],
    experiences: [],
    projects: [{ title: "", description: "", link: "", techs: [], images: [] }],
  });

  const [aiLoading, setAiLoading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // 스킬 자동완성
  const [skillInput, setSkillInput] = useState("");
  const [suggestions, setSuggestions] = useState<(typeof DEVICON_SKILLS)[number][]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // ------ 초기 진입 시 state 반영 (타입 안전 병합) ------
  useEffect(() => {
    if (state?.id) setPortfolioId(state.id);
    if (state?.kind) setKind(state.kind);

    if (state?.data) {
      const d = state.data; // narrowing 유지
      setFormData((prev) => ({
        ...prev,
        ...d,
        contacts: d.contacts ?? prev.contacts,
        skills: d.skills ?? prev.skills,
        experiences: d.experiences ?? prev.experiences,
        projects: d.projects ?? prev.projects,
      }));
    }
  }, [state]);

  // ------ 언마운트 시 남은 blob URL들 정리 ------
  useEffect(() => {
    return () => {
      try {
        for (const p of formData.projects || []) {
          for (const u of p.images || []) revokeUrl(u);
        }
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------ 입력 핸들러 ------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    index?: number
  ) => {
    const { name, value } = e.target;
    if (typeof index === "number") {
      setFormData((prev) => {
        const next = [...prev.projects];
        next[index] = { ...next[index], [name]: value } as any;
        return { ...prev, projects: next };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addSkill = (inputValue: string) => {
    const matchedSkill = DEVICON_SKILLS.find(
      (s) => s.name.toLowerCase() === inputValue.toLowerCase()
    );
    const newSkill = matchedSkill ?? { name: inputValue, icon: "" };

    setFormData((prev) => {
      if (prev.skills.some((s) => s.name === newSkill.name)) return prev;
      return { ...prev, skills: [...prev.skills, newSkill] };
    });

    setSkillInput("");
    setSuggestions([]);
    setHighlightIndex(-1);
  };

  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { title: "", description: "", link: "", techs: [], images: [] },
      ],
    }));
  };

  const removeProject = (index: number) => {
    // 삭제되는 프로젝트의 blob URL도 정리
    const target = formData.projects[index];
    (target?.images ?? []).forEach((u) => revokeUrl(u));

    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  // ------ AI 요약 ------
  async function handleAiSummary(index: number) {
    try {
      setAiLoading(index);

      const payload: GenerateSummaryReq = {
        name: formData.name,
        role: formData.role,
        introduction: formData.introduction,
        skills: (formData.skills || []).map((s) => s.name),
        projects: (formData.projects || []).map((p) => ({
          title: p.title,
          description: p.description,
          link: p.link || undefined,
        })),
      };

      const { summary } = await generateSummary(payload);

      setFormData((prev) => {
        const next = [...prev.projects];
        next[index] = { ...next[index], description: summary };
        return { ...prev, projects: next };
      });
    } catch (e: any) {
      alert(e?.message ?? "요약 생성 실패");
    } finally {
      setAiLoading(null);
    }
  }

  // ------ 저장(DB) ------
  async function handleSave() {
    try {
      setSaving(true);
      let id = portfolioId;
      if (!id) {
        const created = await createDefault(kind); // 서버에서 id 발급
        id = created.id;
        setPortfolioId(id);
      }
      await savePortfolio(id!, formData);
      alert("저장되었습니다.");
      navigate("/home");
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8 bg-background min-h-screen font-sans">
      <h1 className="text-4xl font-extrabold mb-10 text-center text-brand">
        포트폴리오 생성
      </h1>

      {/* 기본 정보 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-accent-light">
        <h2 className="text-2xl font-semibold mb-4 text-brand">기본 정보</h2>

        <input
          type="text"
          name="name"
          placeholder="이름"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-3 border border-accent rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-brand"
        />

        <input
          type="text"
          name="role"
          placeholder="직무 (예: Software Developer)"
          value={formData.role}
          onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
          className="w-full p-3 border border-accent rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-brand"
        />

        <textarea
          name="introduction"
          placeholder="자기소개"
          value={formData.introduction}
          onChange={handleChange}
          onInput={(e) => {
            e.currentTarget.style.height = "auto";
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
          }}
          className="w-full p-3 border border-accent rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-brand overflow-hidden resize-none"
          rows={3}
        />

        {/* 연락처 입력 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-brand mb-2">Contacts</h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {formData.contacts.map((c, index) => {
              const option = CONTACT_OPTIONS.find((o) => o.type === c.type);
              return (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-200 text-brand rounded-full flex items-center gap-2"
                >
                  {option && <img src={option.icon} alt={c.type} className="w-5 h-5" />}
                  {c.value}
                  <button
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        contacts: prev.contacts.filter((_, i) => i !== index),
                      }))
                    }
                    className="text-xs text-red-500"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>

          <div className="flex gap-2">
            <select
              id="contactType"
              className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {CONTACT_OPTIONS.map((o) => (
                <option key={o.type} value={o.type}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              id="contactValue"
              placeholder="주소 또는 이메일 입력"
              className="flex-1 p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              onClick={() => {
                const typeSelect = document.getElementById("contactType") as HTMLSelectElement;
                const valueInput = document.getElementById("contactValue") as HTMLInputElement;
                if (valueInput.value.trim()) {
                  setFormData((prev) => ({
                    ...prev,
                    contacts: [
                      ...prev.contacts,
                      { type: typeSelect.value as Contact["type"], value: valueInput.value.trim() },
                    ],
                  }));
                  valueInput.value = "";
                }
              }}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              + 추가
            </button>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-accent-light">
        <h2 className="text-2xl font-semibold mb-4 text-brand">Skills</h2>

        <div className="flex flex-wrap gap-4 mb-4">
          {formData.skills.map((skill, index) => (
            <div key={index} className="flex flex-col items-center">
              {skill.icon ? (
                <div className="w-12 h-12 rounded-full overflow-hidden shadow-md">
                  <img src={skill.icon} alt={skill.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 shadow-md">
                  <span className="text-xs text-brand">{skill.name}</span>
                </div>
              )}
              <button
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    skills: prev.skills.filter((_, i) => i !== index),
                  }))
                }
                className="text-xs text-red-500 mt-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* 입력 + 자동완성 */}
        <div className="relative">
          <input
            type="text"
            placeholder="스킬 입력 후 Enter (예: React, TypeScript)"
            value={skillInput}
            onChange={(e) => {
              const value = e.target.value;
              setSkillInput(value);

              if (value.trim()) {
                const filtered = DEVICON_SKILLS.filter((s) =>
                  s.name.toLowerCase().includes(value.toLowerCase())
                ).slice(0, 5);
                setSuggestions(filtered);
                setHighlightIndex(-1);
              } else {
                setSuggestions([]);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex((p) => (p < suggestions.length - 1 ? p + 1 : 0));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex((p) => (p > 0 ? p - 1 : suggestions.length - 1));
              } else if (e.key === "Enter" && skillInput.trim()) {
                e.preventDefault();
                if (highlightIndex >= 0) addSkill(suggestions[highlightIndex].name);
                else addSkill(skillInput.trim());
              }
            }}
            className="w-full p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
          />

          {suggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-accent-light rounded-lg mt-1 shadow-md">
              {suggestions.map((s, idx) => (
                <li
                  key={idx}
                  onClick={() => addSkill(s.name)}
                  className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                    idx === highlightIndex ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  {s.icon && <img src={s.icon} alt={s.name} className="w-5 h-5" />}
                  <span>{s.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Experience */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-accent-light">
        <h2 className="text-2xl font-semibold mb-4 text-brand">Experience</h2>

        {formData.experiences?.map((exp, index) => (
          <div key={index} className="mb-6 border-b pb-6 last:border-none last:pb-0">
            <input
              type="text"
              placeholder="회사명"
              value={exp.company}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => {
                  const next = [...prev.experiences];
                  next[index] = { ...next[index], company: v };
                  return { ...prev, experiences: next };
                });
              }}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />

            <input
              type="text"
              placeholder="근무 기간 (예: 2024.03 ~ 2025.02)"
              value={exp.period}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => {
                  const next = [...prev.experiences];
                  next[index] = { ...next[index], period: v };
                  return { ...prev, experiences: next };
                });
              }}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />

            <input
              type="text"
              placeholder="직무 / 직책 (예: Backend Developer)"
              value={exp.position}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => {
                  const next = [...prev.experiences];
                  next[index] = { ...next[index], position: v };
                  return { ...prev, experiences: next };
                });
              }}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />

            <textarea
              placeholder="담당 업무 및 주요 성과"
              value={exp.description}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => {
                  const next = [...prev.experiences];
                  next[index] = { ...next[index], description: v };
                  return { ...prev, experiences: next };
                });
              }}
              onInput={(e) => {
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand overflow-hidden resize-none"
            />

            {/* 경험 기술 스택 */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {exp.techs?.map((tech, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-200 text-brand rounded-full flex items-center gap-2"
                  >
                    {tech}
                    <button
                      onClick={() => {
                        setFormData((prev) => {
                          const next = [...prev.experiences];
                          next[index] = {
                            ...next[index],
                            techs: (next[index].techs || []).filter((_, j) => j !== i),
                          };
                          return { ...prev, experiences: next };
                        });
                      }}
                      className="text-xs text-red-500"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="사용한 기술 입력 후 Enter (예: Spring Boot)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    e.preventDefault();
                    const v = e.currentTarget.value.trim();
                    setFormData((prev) => {
                      const next = [...prev.experiences];
                      next[index] = {
                        ...next[index],
                        techs: [...(next[index].techs || []), v],
                      };
                      return { ...prev, experiences: next };
                    });
                    e.currentTarget.value = "";
                  }
                }}
                className="w-full p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="text-right">
              <button
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    experiences: prev.experiences.filter((_, i) => i !== index),
                  }))
                }
                className="text-sm px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition"
              >
                삭제
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() =>
            setFormData((prev) => ({
              ...prev,
              experiences: [
                ...(prev.experiences || []),
                { company: "", period: "", position: "", description: "", techs: [] },
              ],
            }))
          }
          className="w-full py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          + Experience 추가
        </button>
      </div>

      {/* Projects */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-accent-light">
        <h2 className="text-2xl font-semibold mb-4 text-brand">Projects</h2>

        {formData.projects.map((project, index) => (
          <div key={index} className="mb-6 border-b pb-6 last:border-none last:pb-0">
            <input
              type="text"
              name="title"
              placeholder="프로젝트 제목"
              value={project.title}
              onChange={(e) => handleChange(e, index)}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />

            <textarea
              name="description"
              placeholder="프로젝트 설명"
              value={project.description}
              onChange={(e) => handleChange(e, index)}
              onInput={(e) => {
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand overflow-hidden resize-none"
            />

            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                onClick={() => aiLoading === null && handleAiSummary(index)}
                disabled={aiLoading === index}
                className="px-3 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-60"
              >
                {aiLoading === index ? "생성 중…" : "AI로 요약"}
              </button>
            </div>

            <input
              type="text"
              name="link"
              placeholder="프로젝트 링크 (예: GitHub, Demo 등)"
              value={project.link}
              onChange={(e) => handleChange(e, index)}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />

            {/* 이미지 업로드 */}
            <div className="mb-4">
              <label className="block text-brand font-semibold mb-2">프로젝트 이미지</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;

                  const newUrls = files.map((file) => URL.createObjectURL(file));

                  setFormData((prev) => {
                    const next = [...prev.projects];
                    next[index] = {
                      ...next[index],
                      images: [...(next[index].images || []), ...newUrls],
                    };
                    return { ...prev, projects: next };
                  });

                  // 동일 파일 재선택 가능하도록 초기화
                  e.currentTarget.value = "";
                }}
                className="block w-full text-sm text-gray-600 border border-accent rounded-lg cursor-pointer bg-gray-50 p-2 focus:outline-none"
              />

              {/* 미리보기 */}
              {!!project.images?.length && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {project.images.map((img, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-accent">
                      <img src={img} alt={`project-${i}`} className="object-cover w-full h-full" />
                      <button
                        onClick={() =>
                          setFormData((prev) => {
                            const next = [...prev.projects];
                            const target = next[index].images?.[i];
                            revokeUrl(target);
                            next[index] = {
                              ...next[index],
                              images: next[index].images?.filter((_, j) => j !== i),
                            };
                            return { ...prev, projects: next };
                          })
                        }
                        className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs rounded-full px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right">
              <button
                onClick={() => removeProject(index)}
                className="text-sm px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition"
              >
                삭제
              </button>
            </div>
          </div>
        ))}

        <button onClick={addProject} className="w-full py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
          + 프로젝트 추가
        </button>
      </div>

      {/* 제출/저장 */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => navigate("/preview", { state: formData })}
          className="bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300"
        >
          미리보기
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-white px-8 py-3 rounded-lg hover:bg-brand-light transition shadow-md disabled:opacity-60"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
};

export default FormPage;
