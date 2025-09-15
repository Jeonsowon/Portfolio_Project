import React from "react";
import { useLocation } from "react-router-dom";
import type { PortfolioData } from "../types/PortfolioData";

const PreviewPage = () => {
  const location = useLocation();
  const data = location.state as PortfolioData;

  if (!data) {
    return <div className="text-center text-accent mt-20 font-sans">No portfolio data provided.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-8 bg-background min-h-screen font-sans">
      <div className="bg-white shadow-sm rounded-lg p-8 border border-accent-light">
        <h1 className="text-4xl font-extrabold mb-6 text-brand">{data.name}</h1>
        <p className="text-lg mb-2 text-accent">
          <strong>Email:</strong> {data.email}
        </p>
        <p className="text-lg mb-8 text-gray-700">{data.introduction}</p>

        <h2 className="text-2xl font-semibold mb-4 text-brand">Projects</h2>
        <div className="space-y-6">
          {data.projects.map((project, index) => (
            <div key={index} className="border rounded-lg p-6 shadow-sm bg-white border-accent-light">
              <h3 className="text-xl font-bold mb-2 text-brand">{project.title}</h3>
              <p className="text-gray-700 mb-3">{project.description}</p>
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-dark"
                >
                  🔗 View Project
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreviewPage;