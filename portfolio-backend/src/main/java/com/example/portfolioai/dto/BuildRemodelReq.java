// src/main/java/com/example/portfolioai/dto/BuildRemodelReq.java
package com.example.portfolioai.dto;

public class BuildRemodelReq {
    private long basePortfolioId;   // 선택한 기본 포트폴리오 id
    private String sourceType;      // "url" | "text"
    private String title;           // 공고 타이틀(회사명 등)
    private String value;           // URL 혹은 공고 전문 텍스트

    public long getBasePortfolioId() { return basePortfolioId; }
    public void setBasePortfolioId(long basePortfolioId) { this.basePortfolioId = basePortfolioId; }

    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
