// PortfolioSummaryView.java
package com.example.portfolioai.portfolio;

import java.time.Instant;

public interface PortfolioSummaryView {
    Long getId();
    Portfolio.Kind getKind();
    Instant getUpdatedAt();
}
