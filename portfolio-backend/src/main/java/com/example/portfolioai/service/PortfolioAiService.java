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
        String tone = req.tone() != null ? req.tone() : "insightful";

        var system = Map.of(
            "role", "system",
            "content", """
                당신은 한국어 포트폴리오 카피라이터입니다.
                규칙:
                - 채용담당자/리뷰어가 빠르게 파악할 수 있게 핵심-first로 씁니다.
                - 과장/허위 금지. 수치가 없으면 '제안 형태'로만 언급합니다(예: "~% 개선 제안").
                - 불필요한 수식어/장황한 표현 금지. 자연스럽고 전문적인 톤 유지.
                - 한국어로만 응답.
                - 아래의 출력 형식을 정확히 지킵니다.

                출력 형식(마크다운):
                ✅ 요약 (2~3문장)
                - 문제/목표 → 해결/역할 → 결과/임팩트

                💡 개선 제안
                - 불릿 3~5개 (정량지표/버전/트래픽/보안/테스트/협업 흐름 등)

                📌 추가로 넣으면 좋은 정보
                - 불릿 2~3개 (누락된 맥락, 의사결정 배경, 검증 방법 등)

                📘 참고 문장 예시
                - 1~2개 문장 (포트폴리오에 그대로 붙여 써도 되는 짧은 카피)
                """
        );

        // ✅ Java에서 올바른 join 사용
        String bulletsJoined = String.join(", ",
            Optional.ofNullable(req.bullets()).orElse(List.of()));
        String techsJoined = String.join(", ",
            Optional.ofNullable(req.techs()).orElse(List.of()));

        String userContent = """
            [프로젝트 제목] %s
            [본인 역할] %s
            [핵심 포인트] %s
            [사용 기술] %s
            [톤] %s

            위 정보를 바탕으로 '문제-해결-결과' 흐름을 강조하고,
            결과는 가능하면 정량 지표(성능, 속도, 비용, 트래픽, 안정성, 실패율 등) 중심으로 제안하세요.
            실제 수치가 없으면 '추가하면 좋은 예시 수치'로만 제안하세요.
            출력은 지정된 마크다운 섹션 4개(✅, 💡, 📌, 📘)로만 구성하세요.
            """.formatted(
                nv(req.title()),
                nv(req.role()),
                bulletsJoined,
                techsJoined,
                tone
            );

        var user = Map.of("role", "user", "content", userContent);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("max_output_tokens", maxOutputTokens);
        body.put("input", List.of(system, user));

        return openAiWebClient.post()
            .uri("/responses")
            .bodyValue(body)
            .retrieve()
            .onStatus(
                HttpStatusCode::isError,
                (ClientResponse cr) -> cr.bodyToMono(String.class)
                    .defaultIfEmpty("")
                    .flatMap(err -> {
                        System.err.println("OpenAI API Error: " + cr.statusCode() + " -> " + err);
                        return Mono.error(new ResponseStatusException(cr.statusCode(), err));
                    })
            )
            .bodyToMono(String.class)
            .map(this::extractTextSafely)
            .map(GenerateSummaryRes::new);
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