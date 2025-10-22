package com.example.portfolioai.controller;

import java.time.Duration;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.portfolioai.dto.GenerateSummaryReq;
import com.example.portfolioai.dto.GenerateSummaryRes;
import com.example.portfolioai.service.PortfolioAiService;

import jakarta.validation.Valid;

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
    public ResponseEntity<GenerateSummaryRes> generateSummary(@Valid @RequestBody GenerateSummaryReq req) {
        try {
            // WebClient -> 동기화
            GenerateSummaryRes res = service.generate(req).block(Duration.ofSeconds(30));
            if (res == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new GenerateSummaryRes("요약 생성 실패: 빈 응답"));
            }
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            String msg = (e.getMessage() == null || e.getMessage().isBlank())
                    ? "요약 생성 중 오류가 발생했습니다."
                    : e.getMessage();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new GenerateSummaryRes("요약 생성 실패: " + msg));
        }
    }
}
