// src/main/java/com/example/portfolioai/dto/RemodelBuildRes.java
package com.example.portfolioai.dto;

public record RemodelBuildRes(
    long id,
    String kind,          // "REMODEL"
    PortfolioData data,
    String title,
    String updatedAt
) {}