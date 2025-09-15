import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PortfolioData } from "../types/PortfolioData";

const FormPage = () => {
  const [formData, setFormData] = useState<PortfolioData>({
    name: "",
    email: "",
    introduction: "",
    projects: [{ title: "", description: "", link: "" }],
  });

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index?: number) => {
    const { name, value } = e.target;
    if (typeof index === "number") {
      const updatedProjects = [...formData.projects];
      (updatedProjects[index] as any)[name] = value;
      setFormData({ ...formData, projects: updatedProjects });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, { title: "", description: "", link: "" }],
    });
  };

  const removeProject = (index: number) => {
    const updatedProjects = formData.projects.filter((_, i) => i !== index);
    setFormData({ ...formData, projects: updatedProjects });
  };

  const handleSubmit = () => {
    navigate("/preview", { state: formData });
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-background min-h-screen font-sans">
      <h1 className="text-4xl font-extrabold mb-10 text-center text-brand">
        포트폴리오 생성
      </h1>

      {/* 기본 정보 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-accent-light">
        <h2 className="text-2xl font-semibold mb-4 text-brand">
          기본 정보
        </h2>
        <input
          type="text"
          name="name"
          placeholder="이름"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-3 border border-accent rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <input
          type="email"
          name="email"
          placeholder="이메일"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-3 border border-accent rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <textarea
          name="introduction"
          placeholder="자기소개"
          value={formData.introduction}
          onChange={handleChange}
          className="w-full p-3 border border-accent rounded-lg mb-4 focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* 프로젝트 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8 border border-accent-light">
        <h2 className="text-2xl font-semibold mb-4 text-brand">
          프로젝트
        </h2>
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
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <input
              type="text"
              name="link"
              placeholder="프로젝트 링크 (예: GitHub)"
              value={project.link}
              onChange={(e) => handleChange(e, index)}
              className="w-full p-3 border border-accent rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-brand"
            />
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
        <button
          onClick={addProject}
          className="w-full py-3 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          + 프로젝트 추가
        </button>
      </div>

      {/* 제출 */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          className="bg-brand text-white px-8 py-3 rounded-lg hover:bg-brand-light transition shadow-md"
        >
          미리보기
        </button>
      </div>
    </div>
  );
};

export default FormPage;