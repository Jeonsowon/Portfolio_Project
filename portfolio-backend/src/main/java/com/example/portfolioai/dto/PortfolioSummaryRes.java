// src/main/java/com/example/portfolioai/controller/PortfolioSummaryRes.java
package com.example.portfolioai.dto;

public record PortfolioSummaryRes(
    Long id,
    String kind,
    String title,
    String role,
    String updatedAt
) {}