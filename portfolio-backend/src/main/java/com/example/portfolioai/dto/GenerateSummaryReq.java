// src/main/java/com/app/ai/dto/GenerateSummaryReq.java
package com.example.portfolioai.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

public record GenerateSummaryReq(
    @NotBlank String title,
    String role,                 // 본인 역할(선택)
    List<String> bullets,        // 핵심 포인트 (선택)
    List<String> techs,          // 사용 기술 (선택)
    String tone                  // "concise" | "friendly" 등 (선택)
) {}
