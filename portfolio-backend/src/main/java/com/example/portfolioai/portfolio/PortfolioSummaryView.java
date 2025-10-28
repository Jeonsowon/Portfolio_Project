package com.example.portfolioai.portfolio;

import java.time.LocalDateTime;

public interface PortfolioSummaryView {
    Long getId();
    String getKind();         // "BASIC" | "REMODEL"
    String getTitle();
    String getRole();         // 화면 카드에 보여줄 role
    LocalDateTime getUpdatedAt();
}