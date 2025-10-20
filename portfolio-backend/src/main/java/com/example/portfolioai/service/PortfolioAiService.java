package com.example.portfolioai.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import com.example.portfolioai.dto.GenerateSummaryReq;
import com.example.portfolioai.dto.GenerateSummaryRes;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import reactor.core.publisher.Mono;

@Service
public class PortfolioAiService {

    private final WebClient openAiWebClient;
    private final ObjectMapper om = new ObjectMapper();

    @Value("${openai.model:gpt-4o-mini}")
    private String model;

    @Value("${openai.max-output-tokens:500}")
    private int maxOutputTokens;

    public PortfolioAiService(WebClient openAiWebClient) {
        this.openAiWebClient = openAiWebClient;
    }

    public Mono<GenerateSummaryRes> generate(GenerateSummaryReq req) {
        // 시스템/유저 메시지 구성
        var system = Map.of(
            "role", "system",
            "content", """
                당신은 한국어 포트폴리오 카피라이터입니다.
                - 3~6문장, 간결하고 구체적으로 작성
                - 불필요한 수식어 금지
                - 문단 텍스트로만 반환
                """
        );

        String userContent = """
            [프로젝트 제목] %s
            [본인 역할] %s
            [핵심 포인트] %s
            [사용 기술] %s
            [톤] %s
            위 정보로 한국어 프로젝트 개요를 3~6문장으로 작성하세요.
            """.formatted(
                nv(req.title()),
                nv(req.role()),
                String.join(", ", Optional.ofNullable(req.bullets()).orElse(List.of())),
                String.join(", ", Optional.ofNullable(req.techs()).orElse(List.of())),
                nv(req.tone())
            );

        var user = Map.of("role", "user", "content", userContent);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("max_output_tokens", maxOutputTokens);
        body.put("input", List.of(system, user)); // Responses API 형식

        return openAiWebClient.post()
            .uri("/responses")
            .bodyValue(body)
            .retrieve()
            .onStatus(
                HttpStatusCode::isError,                                   // ✅ ① 상태코드 조건
                (ClientResponse cr) -> cr.bodyToMono(String.class)         // ✅ ② 에러 만들기
                    .defaultIfEmpty("")
                    .flatMap(errorBody -> {
                        System.err.println("OpenAI API Error: " 
                                        + cr.statusCode() + " -> " + errorBody);
                        // 프론트에도 같은 상태코드/메시지 전달
                        return Mono.error(new ResponseStatusException(cr.statusCode(), errorBody));
                    })
            )
            .bodyToMono(String.class)
            .map(this::extractTextSafely)
            .map(GenerateSummaryRes::new);  // ← DTO로 매핑 (Mono<GenerateSummaryRes>)
    }

    private String nv(String s) { return (s == null || s.isBlank()) ? "-" : s; }

    private String extractTextSafely(String json) {
        try {
            JsonNode root = om.readTree(json);
            if (root.has("output_text")) {
                return root.get("output_text").asText();
            }
            if (root.has("output") && root.get("output").isArray()) {
                for (JsonNode item : root.get("output")) {
                    if (item.has("content")) {
                        for (JsonNode c : item.get("content")) {
                            if (c.has("text")) return c.get("text").asText();
                        }
                    }
                }
            }
            return json; // fallback (디버그용)
        } catch (Exception e) {
            System.err.println("OpenAI 응답 파싱 실패: " + e.getMessage());
            return json;
        }
    }
}