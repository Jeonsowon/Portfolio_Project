package com.example.portfolioai.controller;

import com.example.portfolioai.dto.GenerateSummaryReq;
import com.example.portfolioai.dto.GenerateSummaryRes;
import com.example.portfolioai.service.PortfolioAiService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1")
public class PortfolioAiController {

    private final PortfolioAiService service;

    public PortfolioAiController(PortfolioAiService service) {
        this.service = service;
    }

    @PostMapping(
        value = "/generate-summary",
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public Mono<GenerateSummaryRes> generateSummary(@Valid @RequestBody GenerateSummaryReq req) {
        return service.generate(req);
    }
}