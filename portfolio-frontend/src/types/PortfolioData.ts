// types/PortfolioData.ts

export type Education = {
  school: string;
  degree?: string;   // 학위(ex. B.S., M.S.)
  major?: string;    // 전공
  start?: string;    // YYYY-MM
  end?: string;      // YYYY-MM 또는 "현재"
  description?: string;
};

export type Certification = {
  name: string;      // 자격증명
  issuer?: string;   // 발급기관
  date?: string;     // YYYY-MM-DD
  expires?: string;  // 만료일(선택)
  credentialId?: string; // 자격번호(선택)
};

export type Award = {
  title: string;     // 수상명
  issuer?: string;   // 주최/발급
  date?: string;     // YYYY-MM-DD
  description?: string;
};

export interface Skill {
  name: string;
  icon: string;
}

export type Project = {
  title: string;
  teamSize?: number;
  myRole?: string;
  contributions?: string[];
  description: string;
  link: string;
  techs: string[];
  images: string[];
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
  educations: Education[];
  certifications: Certification[];
  awards: Award[];
};