// src/main/java/com/example/portfolioai/service/PortfolioCompactUtil.java
package com.example.portfolioai.service;

import java.util.Collections;
import java.util.List;

import com.example.portfolioai.dto.PortfolioData;

public final class PortfolioCompactUtil {

    private PortfolioCompactUtil() {}

    public static List<String> skills(PortfolioData p) {
        return (p == null || p.getSkills() == null) ? Collections.emptyList() : p.getSkills();
    }

    public static List<PortfolioData.ProjectItem> projects(PortfolioData p) {
        return (p == null || p.getProjects() == null) ? Collections.emptyList() : p.getProjects();
    }

    public static String name(PortfolioData p) {
        return p == null ? "" : String.valueOf(p.getName());
    }

    public static String role(PortfolioData p) {
        return p == null ? "" : String.valueOf(p.getRole());
    }

    public static String introduction(PortfolioData p) {
        return p == null ? "" : String.valueOf(p.getIntroduction());
    }
}