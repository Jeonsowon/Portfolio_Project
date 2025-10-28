// src/main/java/com/example/portfolioai/dto/PortfolioData.java
package com.example.portfolioai.dto;

import java.util.ArrayList;
import java.util.List;

public class PortfolioData {

    private String name;
    private String role;
    private String introduction;
    private List<String> skills = new ArrayList<>();
    private List<ProjectItem> projects = new ArrayList<>();

    // --- getters / setters ---
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getIntroduction() { return introduction; }
    public void setIntroduction(String introduction) { this.introduction = introduction; }

    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }

    public List<ProjectItem> getProjects() { return projects; }
    public void setProjects(List<ProjectItem> projects) { this.projects = projects; }

    // 편의 생성자(선택)
    public PortfolioData() {}
    public PortfolioData(String name, String role, String introduction,
                         List<String> skills, List<ProjectItem> projects) {
        this.name = name;
        this.role = role;
        this.introduction = introduction;
        if (skills != null) this.skills = skills;
        if (projects != null) this.projects = projects;
    }

    // 프로젝트 아이템 정의
    public static class ProjectItem {
        private String title;
        private String role;
        private List<String> techStack = new ArrayList<>();
        private String summary;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public List<String> getTechStack() { return techStack; }
        public void setTechStack(List<String> techStack) { this.techStack = techStack; }

        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
    }
}