// src/main/java/com/example/portfolioai/dto/ProjectItem.java
package com.example.portfolioai.dto;

import java.util.ArrayList;
import java.util.List;

public class ProjectItem {
    private String title;
    private String summary;             // 간단 소개/기여 요약
    private List<String> techStack = new ArrayList<>();
    private String role;                // 맡은 역할(백엔드, 풀스택 등)
    private String period;
    private String link;                // 깃허브/배포 링크 등

    public ProjectItem() {}

    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public List<String> getTechStack() { return techStack; }
    public String getRole() { return role; }
    public String getPeriod() { return period; }
    public String getLink() { return link; }

    public void setTitle(String title) { this.title = title; }
    public void setSummary(String summary) { this.summary = summary; }
    public void setTechStack(List<String> techStack) { this.techStack = techStack; }
    public void setRole(String role) { this.role = role; }
    public void setPeriod(String period) { this.period = period; }
    public void setLink(String link) { this.link = link; }
}