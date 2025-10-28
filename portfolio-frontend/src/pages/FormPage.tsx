// src/pages/FormPage.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { PortfolioData, Contact } from "../types/PortfolioData";
import { CONTACT_OPTIONS } from "../data/contactOptions";
import { DEVICON_SKILLS } from "../data/deviconSkills";
import { generateSummary } from "../lib/apis";
import type { GenerateSummaryReq } from "../types/api";
import { createDefault, savePortfolio } from "../lib/portfolioApi";

type ContactType = Contact["type"];

// ------ utils: blob URL 정리 ------
const isBlobUrl = (u: unknown): u is string =>
  typeof u === "string" && u.startsWith("blob:");

const revokeUrl = (u?: string | null): void => {
  if (isBlobUrl(u)) URL.revokeObjectURL(u || "");
};

type LocationState =
  | { id?: number; kind?: "BASIC" | "REMODEL"; data?: PortfolioData }
  | undefined;

const DRAFT_KEY = (id?: number | null) => `pf:draft:${id ?? "new"}`;

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
    educations: [],
    certifications: [],
    awards: [],
  });

  const [aiLoading, setAiLoading] = useState<number | null>(null);
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // ===== Contacts 입력을 제어 컴포넌트로 =====
  const [contactType, setContactType] = useState<ContactType>(
    (CONTACT_OPTIONS[0]?.type as ContactType)
  );
  const [contactValue, setContactValue] = useState("");

  function addContact() {
    const v = contactValue.trim();
    if (!v) return;
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { type: contactType, value: v }],
    }));
    setContactValue("");
  }

  function removeContactAt(idx: number) {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx),
    }));
  }

  // ===== 스킬 자동완성 =====
  const [skillInput, setSkillInput] = useState("");
  const [suggestions, setSuggestions] = useState<(typeof DEVICON_SKILLS)[number][]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // ------ 초기 진입 시 state/draft 반영 ------
  useEffect(() => {
    if (state?.id) setPortfolioId(state.id);
    if (state?.kind) setKind(state.kind);

    const draftRaw = sessionStorage.getItem(DRAFT_KEY(state?.id ?? null));
    const draft: Partial<PortfolioData> | null = draftRaw ? JSON.parse(draftRaw) : null;

    const src = state?.data ?? draft;
    if (src) {
      setFormData((prev) => ({
        ...prev,
        ...src,
        contacts: src.contacts ?? prev.contacts,
        skills: src.skills ?? prev.skills,
        experiences: src.experiences ?? prev.experiences,
        projects: src.projects ?? prev.projects,
        educations: src.educations ?? prev.educations,
        certifications: src.certifications ?? prev.certifications,
        awards: src.awards ?? prev.awards,
      }));
    }
  }, [state]);

  // draft 자동 저장
  useEffect(() => {
    const t = setTimeout(() => {
      sessionStorage.setItem(DRAFT_KEY(portfolioId), JSON.stringify(formData));
    }, 300);
    return () => clearTimeout(t);
  }, [formData, portfolioId]);

  useEffect(() => {
    setAiNotes((prev) => {
      const next = [...prev];
      if (next.length < formData.projects.length) next.length = formData.projects.length;
      else if (next.length > formData.projects.length) next.length = formData.projects.length;
      return next;
    });
  }, [formData.projects.length]);

  // 언마운트 시 blob URL들 정리
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
    const target = formData.projects[index];
    (target?.images ?? []).forEach((u) => revokeUrl(u));

    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  // 파일 → dataURL (DB 저장용)
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function buildSummaryReq(index: number): GenerateSummaryReq {
    const p = formData.projects[index];

    const bullets: string[] = [];
    if (p.description) bullets.push(p.description);
    if (p.myRole) bullets.push(`My Role: ${p.myRole}`);
    if (p.contributions?.length) bullets.push(`Contributions: ${p.contributions.join(", ")}`);
    if (p.techs?.length) bullets.push(`Techs: ${p.techs.join(", ")}`);
    if (typeof p.teamSize === "number") bullets.push(`Team Size: ${p.teamSize}`);

    return {
      title: p.title || "Untitled Project",
      role: formData.role || undefined,
      bullets,
      techs: p.techs && p.techs.length ? p.techs : undefined,
      tone: "insightful",
    };
  }

  // ------ AI 요약 ------
  async function handleAiSummary(index: number) {
    try {
      setAiLoading(index);
      const payload = buildSummaryReq(index);
      const { summary } = await generateSummary(payload);

      setAiNotes((prev) => {
        const next = [...prev];
        next[index] = summary; // 참고용 텍스트만 보관
        return next;
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
        const created = await createDefault(kind);
        id = created.id;
        setPortfolioId(id);
      }
      await savePortfolio(id!, formData);
      alert("저장되었습니다.");
      navigate("/home");
      sessionStorage.removeItem(DRAFT_KEY(portfolioId));
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  // 미리보기
  const goPreview = () => {
    navigate("/preview", {
      state: { id: portfolioId ?? undefined, kind, data: formData },
    });
  };

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

        {/* ===== Contacts ===== */}
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
                  {c.value || <span className="text-gray-500">값 없음</span>}
                  <button
                    type="button"
                    onClick={() => removeContactAt(index)}
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
              className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              value={contactType}
              onChange={(e) => setContactType(e.target.value as ContactType)}
            >
              {CONTACT_OPTIONS.map((o) => (
                <option key={o.type} value={o.type}>
                  {o.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="주소 또는 이메일 입력 후 Enter"
              className="flex-1 p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e as any).nativeEvent?.isComposing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  addContact();
                }
              }}
            />

            <button
              type="button"
              onClick={addContact}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              + 추가
            </button>
          </div>
        </div>
      </div>

      {/* ===== Skills ===== */}
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
                type="button"
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
              if ((e as any).nativeEvent?.isComposing) return;

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

      {/* Education */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-accent-light">
        <h2 className="text-2xl font-semibold mb-4 text-brand">Education</h2>

        {(formData.educations ?? []).map((edu, index) => (
          <div key={index} className="mb-6 border-b pb-6 last:border-none last:pb-0">
            <input
              type="text"
              placeholder="학교명 (예: OO대학교)"
              value={edu.school}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => {
                  const next = [...(prev.educations ?? [])];
                  next[index] = { ...next[index], school: v };
                  return { ...prev, educations: next };
                });
              }}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="학위 (예: B.S., M.S.)"
                value={edu.degree ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.educations ?? [])];
                    next[index] = { ...next[index], degree: v };
                    return { ...prev, educations: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <input
                type="text"
                placeholder="전공 (예: 컴퓨터공학)"
                value={edu.major ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.educations ?? [])];
                    next[index] = { ...next[index], major: v };
                    return { ...prev, educations: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <input
                type="month"
                placeholder="시작(YYYY-MM)"
                value={edu.start ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.educations ?? [])];
                    next[index] = { ...next[index], start: v };
                    return { ...prev, educations: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <input
                type="month"
                placeholder="종료(YYYY-MM)"
                value={edu.end ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.educations ?? [])];
                    next[index] = { ...next[index], end: v };
                    return { ...prev, educations: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <textarea
              placeholder="주요 과목/활동/성취 등"
              value={edu.description ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => {
                  const next = [...(prev.educations ?? [])];
                  next[index] = { ...next[index], description: v };
                  return { ...prev, educations: next };
                });
              }}
              onInput={(e) => {
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              className="w-full p-3 border border-accent rounded-lg mt-3 focus:outline-none focus:ring-1 focus:ring-brand overflow-hidden resize-none"
            />

            <div className="text-right mt-3">
              <button
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    educations: (prev.educations ?? []).filter((_, i) => i !== index),
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
              educations: [
                ...(prev.educations ?? []),
                { school: "", degree: "", major: "", start: "", end: "", description: "" },
              ],
            }))
          }
          className="w-full py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          + 학력 추가
        </button>
      </div>

      {/* ===== Experience ===== */}
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

            {/* 경험 기술 스택 (IME 대응) */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {exp.techs?.map((tech, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-200 text-brand rounded-full flex items-center gap-2"
                  >
                    {tech}
                    <button
                      type="button"
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
                  // IME 조합 중 Enter 무시
                  if ((e as any).nativeEvent?.isComposing) return;

                  if (e.key === "Enter") {
                    const v = e.currentTarget.value.trim();
                    if (!v) return;
                    e.preventDefault();
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
                type="button"
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
          type="button"
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

      {/* Certifications */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-accent-light">
        <h2 className="text-2xl font-semibold mb-4 text-brand">Certifications</h2>

        {(formData.certifications ?? []).map((c, index) => (
          <div key={index} className="mb-6 border-b pb-6 last:border-none last:pb-0">
            <input
              type="text"
              placeholder="자격증명 (예: 정보처리기사)"
              value={c.name}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => {
                  const next = [...(prev.certifications ?? [])];
                  next[index] = { ...next[index], name: v };
                  return { ...prev, certifications: next };
                });
              }}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="발급기관"
                value={c.issuer ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.certifications ?? [])];
                    next[index] = { ...next[index], issuer: v };
                    return { ...prev, certifications: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <input
                type="text"
                placeholder="자격번호(선택)"
                value={c.credentialId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.certifications ?? [])];
                    next[index] = { ...next[index], credentialId: v };
                    return { ...prev, certifications: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <input
                type="date"
                placeholder="취득일"
                value={c.date ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.certifications ?? [])];
                    next[index] = { ...next[index], date: v };
                    return { ...prev, certifications: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <input
                type="date"
                placeholder="만료일(선택)"
                value={c.expires ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.certifications ?? [])];
                    next[index] = { ...next[index], expires: v };
                    return { ...prev, certifications: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="text-right mt-3">
              <button
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    certifications: (prev.certifications ?? []).filter((_, i) => i !== index),
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
              certifications: [
                ...(prev.certifications ?? []),
                { name: "", issuer: "", date: "" },
              ],
            }))
          }
          className="w-full py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          + 자격증 추가
        </button>
      </div>

      {/* Awards */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-accent-light">
        <h2 className="text-2xl font-semibold mb-4 text-brand">Awards</h2>

        {(formData.awards ?? []).map((a, index) => (
          <div key={index} className="mb-6 border-b pb-6 last:border-none last:pb-0">
            <input
              type="text"
              placeholder="수상명 (예: 해커톤 대상)"
              value={a.title}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => {
                  const next = [...(prev.awards ?? [])];
                  next[index] = { ...next[index], title: v };
                  return { ...prev, awards: next };
                });
              }}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="주최/발급"
                value={a.issuer ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.awards ?? [])];
                    next[index] = { ...next[index], issuer: v };
                    return { ...prev, awards: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <input
                type="date"
                placeholder="수상일"
                value={a.date ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((prev) => {
                    const next = [...(prev.awards ?? [])];
                    next[index] = { ...next[index], date: v };
                    return { ...prev, awards: next };
                  });
                }}
                className="p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <textarea
              placeholder="수상 내용/성과"
              value={a.description ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((prev) => {
                  const next = [...(prev.awards ?? [])];
                  next[index] = { ...next[index], description: v };
                  return { ...prev, awards: next };
                });
              }}
              onInput={(e) => {
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              className="w-full p-3 border border-accent rounded-lg mt-3 focus:outline-none focus:ring-1 focus:ring-brand overflow-hidden resize-none"
            />

            <div className="text-right mt-3">
              <button
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    awards: (prev.awards ?? []).filter((_, i) => i !== index),
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
              awards: [
                ...(prev.awards ?? []),
                { title: "", issuer: "", date: "", description: "" },
              ],
            }))
          }
          className="w-full py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          + 수상 경력 추가
        </button>
      </div>

      {/* ===== Projects ===== */}
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

            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-brand mb-1">팀 규모(명)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="예: 4"
                  value={project.teamSize ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : undefined;
                    setFormData((prev) => {
                      const next = [...prev.projects];
                      next[index] = { ...next[index], teamSize: v };
                      return { ...prev, projects: next };
                    });
                  }}
                  className="w-full p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brand mb-1">내 역할</label>
                <input
                  type="text"
                  placeholder="예: 백엔드 개발 / 인프라 / 프론트엔드 리드 등"
                  value={project.myRole ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((prev) => {
                      const next = [...prev.projects];
                      next[index] = { ...next[index], myRole: v };
                      return { ...prev, projects: next };
                    });
                  }}
                  className="w-full p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-brand mb-1">기여한 부분</label>

              <div className="flex flex-wrap gap-2 mb-2">
                {(project.contributions ?? []).map((c, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-200 text-brand rounded-full flex items-center gap-2"
                  >
                    {c}
                    <button
                      onClick={() => {
                        setFormData((prev) => {
                          const next = [...prev.projects];
                          next[index] = {
                            ...next[index],
                            contributions: (next[index].contributions ?? []).filter((_, j) => j !== i),
                          };
                          return { ...prev, projects: next };
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
                placeholder="예: 주문/결제 API 설계 및 구현 (Enter로 추가)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    e.preventDefault();
                    const v = e.currentTarget.value.trim();
                    setFormData((prev) => {
                      const next = [...prev.projects];
                      next[index] = {
                        ...next[index],
                        contributions: [...(next[index].contributions ?? []), v],
                      };
                      return { ...prev, projects: next };
                    });
                    e.currentTarget.value = "";
                  }
                }}
                className="w-full p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <textarea
              name="description"
              placeholder="프로젝트 설명"
              value={project.description ?? ""}
              onChange={(e) => {
                handleChange(e, index);
                // 입력과 동시에 높이 갱신
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              onInput={(e) => {
                // 새로 그려질 때도 높이 유지
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              style={{ minHeight: "80px" }} // 기본 최소 높이
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand overflow-hidden resize-none transition-all duration-150"
            />

            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                onClick={() => aiLoading === null && handleAiSummary(index)}
                disabled={aiLoading === index}
                className="px-3 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-60"
              >
                {aiLoading === index ? "생성 중…" : "GPT 설명 받기"}
              </button>
            </div>

            {/* GPT 제안: 참고용 표시만 */}
            {Boolean(aiNotes[index]?.trim()) && (
              <div className="mt-3 border border-accent-light rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-brand">💡 GPT 제안(참고용)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAiNotes((prev) => {
                        const next = [...prev];
                        next[index] = "";
                        return next;
                      })
                    }
                    className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    닫기
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                  {aiNotes[index]}
                </pre>
              </div>
            )}

            <input
              type="text"
              name="link"
              placeholder="프로젝트 링크 (예: GitHub, Demo 등)"
              value={project.link}
              onChange={(e) => handleChange(e, index)}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />

            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {project.techs?.map((tech, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-200 text-brand rounded-full flex items-center gap-2"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => {
                          const next = [...prev.projects];
                          next[index] = {
                            ...next[index],
                            techs: (next[index].techs || []).filter((_, j) => j !== i),
                          };
                          return { ...prev, projects: next };
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
                placeholder="기술 입력 후 Enter (예: React, Spring Boot)"
                onKeyDown={(e) => {
                  if ((e as any).nativeEvent?.isComposing) return;

                  if (e.key === "Enter") {
                    const v = e.currentTarget.value.trim();
                    if (!v) return;
                    e.preventDefault();
                    setFormData((prev) => {
                      const next = [...prev.projects];
                      next[index] = {
                        ...next[index],
                        techs: [...(next[index].techs || []), v],
                      };
                      return { ...prev, projects: next };
                    });
                    e.currentTarget.value = "";
                  }
                }}
                className="w-full p-3 border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* 이미지 업로드 */}
            <div className="mb-4">
              <label className="block text-brand font-semibold mb-2">프로젝트 이미지</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;

                  const newUrls = await Promise.all(files.map(fileToDataUrl));

                  setFormData((prev) => {
                    const next = [...prev.projects];
                    next[index] = {
                      ...next[index],
                      images: [...(next[index].images || []), ...newUrls],
                    };
                    return { ...prev, projects: next };
                  });

                  e.currentTarget.value = "";
                }}
                className="block w-full text-sm text-gray-600 border border-accent rounded-lg cursor-pointer bg-gray-50 p-2 focus:outline-none"
              />

              {!!project.images?.length && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {project.images.map((img, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-accent">
                      <img src={img} alt={`project-${i}`} className="object-cover w-full h-full" />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => {
                            const next = [...prev.projects];
                            const target = next[index].images?.[i];
                            if (target?.startsWith("blob:")) revokeUrl(target);
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
                type="button"
                onClick={() => removeProject(index)}
                className="text-sm px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition"
              >
                삭제
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addProject}
          className="w-full py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          + 프로젝트 추가
        </button>
      </div>

      {/* 제출/저장 */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300 transition shadow"
        >
          홈으로
        </button>
        <button
          type="button"
          onClick={goPreview}
          className="bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300 transition shadow"
        >
          미리보기
        </button>
        <button
          type="button"
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