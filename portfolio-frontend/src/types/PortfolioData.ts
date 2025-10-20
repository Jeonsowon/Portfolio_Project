// types/PortfolioData.ts

export interface Skill {
  name: string;
  icon: string;
}

export type Project = {
  title: string;
  description: string;
  link: string;
  techs: string[];
  images : string[];
};

export type ContactType =
  | "email"
  | "github"
  | "blog"
  | "notion"
  | "linkedin"
  | "velog"
  | "instagram"
  | "etc";

export type Contact = {
  type: ContactType;
  value: string;
};

export type Experience = {
  company: string;
  period: string;
  position: string;
  description: string;
  techs: string[];
};

export type PortfolioData = {
  name: string;
  role: string;
  contacts: Contact[];
  introduction: string;
  skills: Skill[];
  experiences: Experience[];
  projects: Project[];
};