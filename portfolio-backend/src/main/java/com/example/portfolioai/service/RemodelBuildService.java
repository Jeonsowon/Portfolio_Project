// src/main/java/com/example/portfolioai/service/RemodelBuildService.java
package com.example.portfolioai.service;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import com.example.portfolioai.dto.BuildRemodelReq;
import com.example.portfolioai.dto.JobReqPref;
import com.example.portfolioai.dto.Keyword;
import com.example.portfolioai.dto.Keyword.Kind;
import com.example.portfolioai.dto.PortfolioData;
import com.example.portfolioai.portfolio.PortfolioEntity;
import com.example.portfolioai.portfolio.PortfolioRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class RemodelBuildService {
    public static class RemodelOutcome {
        private final PortfolioData data;
        private final List<Keyword> keywords;
        public RemodelOutcome(PortfolioData data, List<Keyword> keywords) {
            this.data = data;
            this.keywords = keywords;
        }
        public PortfolioData getData() { return data; }
        public List<Keyword> getKeywords() { return keywords; }
    }


    private final ObjectMapper om;
    private final RestTemplate http;
    private final PortfolioRepository portfolioRepository;

    @Value("${openai.api.key}")
    private String openaiApiKey;

    @Value("${openai.model:gpt-5}")
    private String openaiModel;

    public RemodelBuildService(ObjectMapper om, PortfolioRepository portfolioRepository) {
        this.om = om;
        this.portfolioRepository = portfolioRepository;
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.http = new RestTemplate(factory);
    }

    // ======== Public API ========
    public RemodelOutcome buildRemodelOutcome(BuildRemodelReq req) {
        // 0) Base 불러오기 (여기선 가짜 데이터/혹은 기존 Repo 호출)
        PortfolioData base = loadBasePortfolio(req.getBasePortfolioId());

        // 1) 채용공고 → 텍스트
        String html = switch (req.getSourceType()) {
            case "url" -> safeFetchHtml(req.getValue());
            case "text" -> req.getValue();
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceType must be 'url' or 'text'");
        };
        if (!StringUtils.hasText(html)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "공고를 읽지 못했습니다.");
        }

        String clean = htmlToCleanText(html);

        // 2) 자격/우대만 규칙 기반 추출
        JobReqPref rp = extractReqPref(clean);

        // 완전 비었으면 실패 처리(프론트에서 텍스트 모드 유도)
        if (rp.getRequired().isEmpty() && rp.getPreferred().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "공고에서 자격요건/우대사항을 찾지 못했습니다. 텍스트 모드로 해당 섹션만 붙여넣어 주세요.");
        }

        // 3) LLM으로 키워드+가중치 추출 (입력은 섹션만 → 짧음)
        List<Keyword> keywords = extractKeywordsWithLLM(rp);

        // 4) 키워드 기반 점수화 → skills / projects 정렬
        PortfolioData reordered = reorderPortfolio(base, keywords);
        return new RemodelOutcome(reordered, keywords);
    }

    public PortfolioData buildRemodelSync(BuildRemodelReq req) {
        return buildRemodelOutcome(req).getData();
    }

    // ======== Base Portfolio Loader (예시) ========
    private PortfolioData loadBasePortfolio(long id) {
        PortfolioEntity entity = portfolioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "기본 포트폴리오가 없습니다."));

        try {
            Map<String, Object> fe = om.readValue(entity.getDataJson(), new TypeReference<>(){});

            PortfolioData dto = new PortfolioData();
            dto.setName(Objects.toString(fe.getOrDefault("name", ""), ""));
            dto.setRole(Objects.toString(fe.getOrDefault("role", ""), ""));
            dto.setIntroduction(Objects.toString(fe.getOrDefault("introduction", ""), ""));

            // skills: [{name, icon}] -> [name]
            List<String> skills = new ArrayList<>();
            Object feSkills = fe.get("skills");
            if (feSkills instanceof List<?> list) {
                for (Object o : list) {
                    if (o instanceof Map<?,?> m) {
                        Object n = m.get("name");
                        if (n != null) skills.add(Objects.toString(n, ""));
                    } else if (o instanceof String s) {
                        skills.add(s);
                    }
                }
            }
            dto.setSkills(skills);

            // projects: FE -> DTO(ProjectItem)
            List<PortfolioData.ProjectItem> projects = new ArrayList<>();
            Object feProjects = fe.get("projects");
            if (feProjects instanceof List<?> list) {
                for (Object o : list) {
                    if (o instanceof Map<?,?> m) {
                        PortfolioData.ProjectItem pi = new PortfolioData.ProjectItem();
                        pi.setTitle(Objects.toString(m.get("title"), ""));
                        pi.setSummary(Objects.toString(m.get("description"), ""));
                        pi.setRole(Objects.toString(m.get("myRole"), ""));
                        // techs -> techStack
                        List<String> techStack = new ArrayList<>();
                        Object techs = m.get("techs");
                        if (techs instanceof List<?> tl) {
                            for (Object t : tl) techStack.add(Objects.toString(t, ""));
                        }
                        pi.setTechStack(techStack);
                        pi.setLink(Objects.toString(m.get("link"), ""));
                        projects.add(pi);
                    }
                }
            }
            dto.setProjects(projects);
            return dto;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "기본 포트폴리오 파싱 실패");
        }
    }

    // ======== 1) HTML → 클린 텍스트 ========
    private String safeFetchHtml(String url) {
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(url).build(true).toUri();
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (compatible; RemodelBot/1.0)");
            headers.setAccept(List.of(MediaType.TEXT_HTML, MediaType.APPLICATION_XHTML_XML, MediaType.ALL));
            HttpEntity<Void> req = new HttpEntity<>(headers);
            ResponseEntity<String> res = http.exchange(uri, HttpMethod.GET, req, String.class);
            return res.getStatusCode().is2xxSuccessful() ? res.getBody() : "";
        } catch (RestClientException e) {
            return "";
        }
    }

    private String htmlToCleanText(String html) {
        Document doc = Jsoup.parse(html);
        doc.select("script,style,noscript,svg,iframe").remove();
        String text = doc.text();
        return text.replaceAll("\\u00A0", " ")
                   .replaceAll("\\s+", " ")
                   .trim();
    }

    // ======== 2) 자격/우대 섹션 추출(룰-기반) ========
    private static final Pattern REQ_HDR = Pattern.compile("(자격요건|지원자격|필수요건|Requirements?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern PREF_HDR = Pattern.compile("(우대사항|우대조건|가산점|Preferred|Nice to have)", Pattern.CASE_INSENSITIVE);
    private static final Pattern STOP_HDR = Pattern.compile("(주요업무|담당업무|근무조건|전형절차|복리후생|회사소개|About|Responsibilities?)", Pattern.CASE_INSENSITIVE);

    private JobReqPref extractReqPref(String cleanText) {
        // 글머리표 표준화 + 문단 분리
        String normalized = cleanText
                .replaceAll("[•‣▪▶▸·ㆍ]", "- ")
                .replaceAll("\\r", "\n");

        String[] lines = normalized.split("(?<=\\.)\\s+(?=[A-Z가-힣])|\\n");
        List<String> req = new ArrayList<>();
        List<String> pref = new ArrayList<>();
        int mode = 0; // 0 none, 1 req, 2 pref

        for (String raw : lines) {
            String line = raw.trim();
            if (line.isEmpty()) continue;

            if (REQ_HDR.matcher(line).find()) { mode = 1; continue; }
            if (PREF_HDR.matcher(line).find()) { mode = 2; continue; }
            if (STOP_HDR.matcher(line).find()) { mode = 0; continue; }

            if (mode == 1) req.add(line.replaceAll("^[-\\s]+", "").trim());
            if (mode == 2) pref.add(line.replaceAll("^[-\\s]+", "").trim());
        }
        // 과도한 길이 컷
        req = req.stream().filter(s->!s.isBlank()).limit(12).collect(Collectors.toList());
        pref = pref.stream().filter(s->!s.isBlank()).limit(10).collect(Collectors.toList());
        return new JobReqPref(req, pref);
    }

    // ======== 3) LLM: 키워드/가중치 추출 ========
    private List<Keyword> extractKeywordsWithLLM(JobReqPref rp) {
        String reqTxt = String.join("\n- ", rp.getRequired());
        String prefTxt = String.join("\n- ", rp.getPreferred());

        String system = """
                너는 채용공고 요건을 키워드로 구조화하는 보조자다.
                한국어 유지. JSON만 반환.
                요구사항:
                - 기술(프레임워크/언어/DB/인프라)은 kind=TECH
                - 역할/직무(백엔드, 서버개발, DevOps 등)는 kind=ROLE
                - 기타는 kind=ETC
                - weight는 0.2~1.0 사이, 중요할수록 크게
                - 동의어/표기 변형은 대표 표기로 통합 (예: Spring Boot, JPA, MySQL, AWS, Redis 등)
                출력 스키마:
                {"keywords":[{"term":"Spring Boot","weight":0.9,"kind":"TECH"}, ...]}
                """;

        String user = """
                [자격요건]
                - %s

                [우대사항]
                - %s
                """.formatted(reqTxt, prefTxt);

        String body = """
        {
          "model": "%s",
          "input": [{"role":"system","content":%s},{"role":"user","content":%s}],
          "max_output_tokens": 600,
          "temperature": 0.2,
          "response_format": {"type":"json_object"}
        }
        """.formatted(openaiModel, om.valueToTree(system), om.valueToTree(user));

        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(openaiApiKey);
        h.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(body, h);

        try {
            ResponseEntity<String> res = http.exchange(
                    URI.create("https://api.openai.com/v1/responses"),
                    HttpMethod.POST, entity, String.class);

            if (!res.getStatusCode().is2xxSuccessful()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, res.getBody());
            }
            // responses API: { output: [{content:[{type:"output_text", text:"{...json...}"}]}], ... }
            Map<String,Object> root = om.readValue(res.getBody(), new TypeReference<>(){});
            @SuppressWarnings("unchecked")
            List<Map<String,Object>> output = (List<Map<String,Object>>) root.getOrDefault("output", List.of());
            if (output.isEmpty()) return List.of();

            Map<String,Object> first = output.get(0);
            @SuppressWarnings("unchecked")
            List<Map<String,Object>> content = (List<Map<String,Object>>) first.getOrDefault("content", List.of());
            if (content.isEmpty()) return List.of();

            Map<String,Object> item = content.get(0);
            String text = String.valueOf(item.getOrDefault("text", "{}"));
            Map<String,Object> parsed = om.readValue(text, new TypeReference<>(){});
            @SuppressWarnings("unchecked")
            List<Map<String,Object>> arr = (List<Map<String,Object>>) parsed.getOrDefault("keywords", List.of());

            List<Keyword> keywords = new ArrayList<>();
            for (Map<String,Object> m : arr) {
                String term = Objects.toString(m.get("term"), "").trim();
                if (term.isEmpty()) continue;
                double weight = Math.max(0.2, Math.min(1.0, toDouble(m.get("weight"), 0.6)));
                String kindStr = Objects.toString(m.get("kind"), "TECH");
                Kind kind = switch (kindStr.toUpperCase()) {
                    case "ROLE" -> Kind.ROLE;
                    case "ETC" -> Kind.ETC;
                    default -> Kind.TECH;
                };
                keywords.add(new Keyword(term, weight, kind));
            }
            // 중복 통합(최대 가중치)
            Map<String,Keyword> dedup = new LinkedHashMap<>();
            for (Keyword k : keywords) {
                String key = k.getTerm().toLowerCase();
                dedup.compute(key, (kk, old) -> {
                    if (old == null) return k;
                    return (old.getWeight() >= k.getWeight()) ? old : k;
                });
            }
            return new ArrayList<>(dedup.values());
        } catch (RuntimeException | java.io.IOException e) {
            // 실패 시 최소 fallback: 자주 나오는 백엔드 키워드
            return List.of(
                    new Keyword("Java", 0.8, Kind.TECH),
                    new Keyword("Spring Boot", 0.9, Kind.TECH),
                    new Keyword("MySQL", 0.7, Kind.TECH),
                    new Keyword("AWS", 0.7, Kind.TECH),
                    new Keyword("백엔드", 0.8, Kind.ROLE)
            );
        }
    }

    private double toDouble(Object v, double dft) {
        try {
            if (v instanceof Number n) return n.doubleValue();
            return Double.parseDouble(String.valueOf(v));
        } catch (NumberFormatException e) {
            return dft;
        }
    }

    // ======== 4) 키워드 기반 재정렬 ========
    private PortfolioData reorderPortfolio(PortfolioData base, List<Keyword> keywords) {
        // (a) skills 점수화 (문자 배열 유지)
        List<String> skills = new ArrayList<>(base.getSkills());
        Map<String, Double> skillScore = new HashMap<>();
        for (String s : skills) {
            double sc = 0.0;
            for (Keyword k : keywords) {
                if (k.getKind() == Kind.TECH && containsToken(s, k.getTerm())) {
                    sc += 1.0 * k.getWeight();
                } else if (k.getKind() == Kind.ROLE && containsToken(s, k.getTerm())) {
                    sc += 0.6 * k.getWeight();
                }
            }
            // 기본 가중(사소한 스킬은 뒤로)
            skillScore.put(s, sc);
        }
        skills.sort(Comparator.comparingDouble(skillScore::get).reversed());

        // (b) projects 점수화(제목/요약/스택/역할에서 매칭)
        List<PortfolioData.ProjectItem> projects = new ArrayList<>(base.getProjects());
        Map<PortfolioData.ProjectItem, Double> projScore = new HashMap<>();
        for (PortfolioData.ProjectItem p : projects) {
            double sc = 0.0;
            for (Keyword k : keywords) {
                double w = k.getWeight();
                if (k.getKind() == Kind.ROLE && containsAny(p.getRole(), k.getTerm())) sc += 1.2 * w;
                if (k.getKind() == Kind.TECH) {
                    if (containsAny(p.getTitle(), k.getTerm())) sc += 0.6 * w;
                    if (containsAny(p.getSummary(), k.getTerm())) sc += 0.8 * w;
                    for (String t : p.getTechStack()) {
                        if (containsToken(t, k.getTerm())) sc += 1.0 * w;
                    }
                }
            }
            projScore.put(p, sc);
        }
        projects.sort(Comparator.comparingDouble(projScore::get).reversed());

        // (c) 추가 섹션 재정렬: contacts, educations, experiences, certifications, awards
        // base JSON 구조에서 그대로 보존 + 키워드 포함여부 기준으로만 정렬
        // DTO에는 해당 필드가 없으므로 out에는 skills/projects만 담고, 나머지는 컨트롤러에서 FE 스키마로 재조립

        // (d) 최종 조립 (추가 삽입 없이 재정렬만 수행)
        PortfolioData out = new PortfolioData();
        out.setName(base.getName());
        out.setRole(base.getRole());
        out.setIntroduction(base.getIntroduction());
        out.setSkills(skills); // 전체를 유지하되 순서만 변경
        out.setProjects(projects); // 전체를 유지하되 순서만 변경
        return out;
    }

    private boolean containsAny(String text, String needle) {
        if (!StringUtils.hasText(text) || !StringUtils.hasText(needle)) return false;
        return text.toLowerCase().contains(needle.toLowerCase());
    }

    private boolean containsToken(String token, String needle) {
        if (!StringUtils.hasText(token) || !StringUtils.hasText(needle)) return false;
        String a = token.toLowerCase().replaceAll("[^a-z0-9+#\\. ]", " ");
        String b = needle.toLowerCase().replaceAll("[^a-z0-9+#\\. ]", " ");
        // 토큰 단위 비교 (예: spring boot == spring-boot)
        return Arrays.asList(a.split("\\s+")).containsAll(Arrays.asList(b.split("\\s+")))
                || a.contains(b);
    }
}