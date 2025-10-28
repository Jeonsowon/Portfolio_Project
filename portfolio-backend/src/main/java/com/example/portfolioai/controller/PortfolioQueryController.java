// src/main/java/com/example/portfolioai/controller/PortfolioQueryController.java
package com.example.portfolioai.controller;

import java.util.List;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.portfolioai.dto.PortfolioSummaryRes;
import com.example.portfolioai.portfolio.PortfolioEntity;
import com.example.portfolioai.portfolio.PortfolioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/portfolios")
public class PortfolioQueryController {

    private final PortfolioRepository repo;
    private final ObjectMapper mapper;

    public PortfolioQueryController(PortfolioRepository repo, ObjectMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @GetMapping
    public List<PortfolioSummaryRes> list(
        @RequestParam String kind,
        Authentication auth
    ) {
        String email = auth.getName();
        PortfolioEntity.Kind k = PortfolioEntity.Kind.valueOf(kind.toUpperCase());

        return repo.findByOwnerEmailAndKindOrderByUpdatedAtDesc(email, k)
                .stream()
                .map(e -> {

                    String title = "포트폴리오 #" + e.getId();
                    String role = "-";

                    try {
                        @SuppressWarnings("unchecked")
                        Map<String,Object> data = mapper.readValue(e.getDataJson(), Map.class);
                        Object nm = data.get("name");
                        Object rl = data.get("role");
                        if (nm != null && !nm.toString().isBlank()) title = nm.toString().trim();
                        if (rl != null && !rl.toString().isBlank()) role = rl.toString().trim();
                    } catch (Exception ignore) {}
                    return new PortfolioSummaryRes(
                            e.getId(),
                            e.getKind().name(),
                            title,
                            role,
                            e.getUpdatedAt() != null ? e.getUpdatedAt().toString() : null
                    );
                })
                .toList();
    }
}