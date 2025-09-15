// types/PortfolioData.ts

export type Project = {
  title: string;
  description: string;
  link: string;
};

export type PortfolioData = {
  name: string;
  email: string;
  introduction: string;
  projects: Project[];
};