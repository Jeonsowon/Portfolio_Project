// src/main/java/com/example/portfolioai/service/RemodelBuildService.java
package com.example.portfolioai.service;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private static final Logger logger = LoggerFactory.getLogger(RemodelBuildService.class);
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

    @Value("${remodel.ai.enabled:false}")
    private boolean aiEnabled;

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

        // 완전 비었으면 폴백 처리 (전체 텍스트에서 키워드 추출)
        if (rp.getRequired().isEmpty() && rp.getPreferred().isEmpty()) {
            logger.warn("자격요건/우대사항이 추출되지 않음. 전체 텍스트에서 키워드 추출 시도");
            // 전체 텍스트를 자격요건으로 처리
            rp = new JobReqPref(List.of(clean), List.of());
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
    public String safeFetchHtml(String url) {
        logger.info("크롤링 시작: URL = {}", url);
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(url).build(true).toUri();
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (compatible; RemodelBot/1.0)");
            headers.setAccept(List.of(MediaType.TEXT_HTML, MediaType.APPLICATION_XHTML_XML, MediaType.ALL));
            HttpEntity<Void> req = new HttpEntity<>(headers);
            ResponseEntity<String> res = http.exchange(uri, HttpMethod.GET, req, String.class);
            String html = res.getStatusCode().is2xxSuccessful() ? res.getBody() : "";
            logger.info("크롤링 결과: 상태코드 = {}, HTML 길이 = {}", res.getStatusCode(), html != null ? html.length() : 0);
            return html;
        } catch (RestClientException e) {
            logger.error("크롤링 실패: URL = {}, 에러 = {}", url, e.getMessage());
            return "";
        }
    }

    public String htmlToCleanText(String html) {
        Document doc = Jsoup.parse(html);
        doc.select("script,style,noscript,svg,iframe").remove();
        String text = doc.text();
        String cleanText = text.replaceAll("\\u00A0", " ")
                   .replaceAll("\\s+", " ")
                   .trim();
        logger.info("HTML 정제 완료: 원본 길이 = {}, 정제 후 길이 = {}", html.length(), cleanText.length());
        logger.debug("정제된 텍스트 (처음 500자): {}", cleanText.substring(0, Math.min(500, cleanText.length())));
        return cleanText;
    }

    // ======== 2) 자격/우대 섹션 추출(룰-기반) ========
    private static final Pattern REQ_HDR = Pattern.compile("(자격요건|지원자격|필수요건|필수조건|Requirements?|Required|자격|요건)", Pattern.CASE_INSENSITIVE);
    private static final Pattern PREF_HDR = Pattern.compile("(우대사항|우대조건|가산점|Preferred|Nice to have|우대|선호|우대사항|우대조건)", Pattern.CASE_INSENSITIVE);
    private static final Pattern STOP_HDR = Pattern.compile("(주요업무|담당업무|근무조건|전형절차|복리후생|회사소개|About|Responsibilities?|업무내용|근무환경|지원방법|전형절차)", Pattern.CASE_INSENSITIVE);

    public JobReqPref extractReqPref(String cleanText) {
        logger.info("자격요건/우대사항 추출 시작");
        logger.debug("원본 텍스트 (처음 1000자): {}", cleanText.substring(0, Math.min(1000, cleanText.length())));
        
        // 글머리표 표준화 + 줄바꿈 정리
        String normalized = cleanText
                .replaceAll("[•‣▪▶▸·ㆍ]", "- ")
                .replaceAll("\\r\\n", "\n")
                .replaceAll("\\r", "\n")
                .replaceAll("\\n+", "\n");

        // 줄 단위로 분할 (더 정확한 분할)
        String[] lines = normalized.split("\\n");
        List<String> req = new ArrayList<>();
        List<String> pref = new ArrayList<>();
        int mode = 0; // 0 none, 1 req, 2 pref

        logger.debug("분할된 줄 수: {}", lines.length);
        logger.debug("정규화된 텍스트 (처음 1000자): {}", normalized.substring(0, Math.min(1000, normalized.length())));

        for (String raw : lines) {
            String line = raw.trim();
            if (line.isEmpty()) continue;

            logger.debug("처리 중인 줄: '{}' (현재 모드: {})", line, mode);

            // 자격요건 헤더 확인 (더 유연하게)
            if (REQ_HDR.matcher(line).find()) { 
                mode = 1; 
                logger.debug("자격요건 섹션 발견: {}", line);
                continue; 
            }
            // 우대사항 헤더 확인 (더 유연하게)
            if (PREF_HDR.matcher(line).find()) { 
                mode = 2; 
                logger.debug("우대사항 섹션 발견: {}", line);
                continue; 
            }
            // 중단 섹션 확인
            if (STOP_HDR.matcher(line).find()) { 
                mode = 0; 
                logger.debug("추출 중단 섹션 발견: {}", line);
                continue; 
            }

            // 추가 패턴 매칭 (더 유연한 검색)
            if (mode == 0) {
                // 자격요건 관련 키워드가 포함된 줄 찾기
                if (line.contains("년") && (line.contains("경험") || line.contains("필요") || line.contains("요구"))) {
                    mode = 1;
                    logger.debug("자격요건 패턴 발견: {}", line);
                }
                // 우대사항 관련 키워드가 포함된 줄 찾기
                else if (line.contains("우대") || line.contains("선호") || line.contains("좋아요") || line.contains("환영")) {
                    mode = 2;
                    logger.debug("우대사항 패턴 발견: {}", line);
                }
            }

            // 자격요건 처리 (더 유연하게)
            if (mode == 1) {
                String reqItem = line.replaceAll("^[-\\s•‣▪▶▸·ㆍ]+", "").trim();
                if (!reqItem.isBlank() && reqItem.length() > 5) { // 최소 길이를 5자로 줄임
                    req.add(reqItem);
                    logger.debug("자격요건 추가: {}", reqItem);
                }
            }
            // 우대사항 처리 (더 유연하게)
            if (mode == 2) {
                String prefItem = line.replaceAll("^[-\\s•‣▪▶▸·ㆍ]+", "").trim();
                if (!prefItem.isBlank() && prefItem.length() > 5) { // 최소 길이를 5자로 줄임
                    pref.add(prefItem);
                    logger.debug("우대사항 추가: {}", prefItem);
                }
            }
        }
        
        // 과도한 길이 컷
        req = req.stream().filter(s->!s.isBlank()).limit(15).collect(Collectors.toList());
        pref = pref.stream().filter(s->!s.isBlank()).limit(15).collect(Collectors.toList());
        
        logger.info("자격요건/우대사항 추출 완료: 자격요건 {}개, 우대사항 {}개", req.size(), pref.size());
        logger.debug("자격요건: {}", req);
        logger.debug("우대사항: {}", pref);
        
        return new JobReqPref(req, pref);
    }

    // ======== 3) 키워드/가중치 추출 ========
    public List<Keyword> extractKeywordsWithLLM(JobReqPref rp) {
        String reqTxt = String.join("\n- ", rp.getRequired());
        String prefTxt = String.join("\n- ", rp.getPreferred());
        
        logger.debug("자격요건 텍스트: {}", reqTxt);
        logger.debug("우대사항 텍스트: {}", prefTxt);

        // AI 비활성화시 폴백 사용
        if (!aiEnabled) {
            logger.info("규칙 기반 키워드 추출 사용");
            return getFallbackKeywords(reqTxt, prefTxt);
        }

        // AI 추출 시도 (현재 비활성화 상태)
        logger.info("AI 키워드 추출 시도");
        try {
            // AI 로직은 유지하되 현재는 사용하지 않음
            return getFallbackKeywords(reqTxt, prefTxt);
        } catch (Exception e) {
            logger.warn("AI 키워드 추출 실패, 폴백 사용: {}", e.getMessage());
            return getFallbackKeywords(reqTxt, prefTxt);
        }
    }
    
    // 폴백 키워드 추출 (규칙 기반) - 개선된 버전
    private List<Keyword> getFallbackKeywords(String reqTxt, String prefTxt) {
        logger.info("폴백 키워드 추출 시작");
        List<Keyword> keywords = new ArrayList<>();
        
        // 확장된 기술 키워드 패턴 (더 많은 기술 스택 포함)
        String[] techPatterns = {
            // Backend
            "Java", "Spring", "Spring Boot", "Spring Security", "Spring Data", "Spring Cloud", "Spring Framework",
            "JPA", "Hibernate", "MyBatis", "QueryDSL",
            "Python", "Django", "Flask", "FastAPI", "Celery",
            "Node.js", "Express", "NestJS", "Koa",
            "Go", "Gin", "Echo", "Fiber",
            "C#", ".NET", "ASP.NET", "Entity Framework",
            "PHP", "Laravel", "Symfony", "CodeIgniter",
            "Ruby", "Rails", "Sinatra",
            "Rust", "Actix", "Axum", "Rocket",
            
            // Database
            "MySQL", "PostgreSQL", "Oracle", "SQL Server", "SQLite",
            "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB",
            "Neo4j", "CouchDB", "InfluxDB",
            
            // Frontend
            "React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt.js",
            "JavaScript", "TypeScript", "ES6", "ES2015",
            "HTML5", "CSS3", "Sass", "SCSS", "Less", "Stylus",
            "Webpack", "Vite", "Rollup", "Parcel",
            "Tailwind CSS", "Bootstrap", "Material-UI", "Ant Design",
            
            // Mobile
            "React Native", "Flutter", "Ionic", "Xamarin",
            "Android", "iOS", "Kotlin", "Swift",
            
            // DevOps & Cloud
            "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes",
            "Jenkins", "GitLab CI", "GitHub Actions", "CircleCI", "Travis CI",
            "Terraform", "Ansible", "Chef", "Puppet",
            "Nginx", "Apache", "HAProxy",
            
            // AI/ML 관련 추가
            "LLM", "RAG", "Agent", "AI", "ML", "Machine Learning", "Deep Learning",
            "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy",
            "OpenAI", "GPT", "BERT", "Transformer", "NLP", "Computer Vision",
            
            // Tools & Others
            "Git", "GitHub", "GitLab", "Bitbucket", "SVN",
            "Jira", "Confluence", "Slack", "Discord",
            "Linux", "Ubuntu", "CentOS", "Debian",
            "Windows", "macOS", "Unix"
        };
        
        // 확장된 역할 키워드 패턴
        String[] rolePatterns = {
            "백엔드", "프론트엔드", "풀스택", "DevOps", "서버개발", "웹개발",
            "시스템개발", "데이터베이스", "인프라", "클라우드", "시스템관리",
            "데이터엔지니어", "데이터분석가", "ML엔지니어", "AI개발자",
            "모바일개발", "앱개발", "게임개발", "임베디드", "IoT",
            "보안", "네트워크", "QA", "테스트", "자동화"
        };
        
        String combinedText = (reqTxt + " " + prefTxt).toLowerCase();
        logger.debug("폴백 키워드 추출 대상 텍스트: {}", combinedText);
        
        // 기술 키워드 추출 (더 정확한 매칭)
        for (String pattern : techPatterns) {
            String lowerPattern = pattern.toLowerCase();
            if (combinedText.contains(lowerPattern)) {
                // 우대사항에 있으면 더 높은 가중치
                double weight = prefTxt.toLowerCase().contains(lowerPattern) ? 0.9 : 0.7;
                keywords.add(new Keyword(pattern, weight, Kind.TECH));
                logger.debug("폴백 기술 키워드: {} (가중치: {})", pattern, weight);
            }
        }
        
        // 역할 키워드 추출
        for (String pattern : rolePatterns) {
            String lowerPattern = pattern.toLowerCase();
            if (combinedText.contains(lowerPattern)) {
                double weight = prefTxt.toLowerCase().contains(lowerPattern) ? 0.9 : 0.7;
                keywords.add(new Keyword(pattern, weight, Kind.ROLE));
                logger.debug("폴백 역할 키워드: {} (가중치: {})", pattern, weight);
            }
        }
        
        // 추가 키워드 추출: 단어 단위로 더 세밀하게 검색
        keywords.addAll(extractAdditionalKeywords(reqTxt, prefTxt));
        
        // 단어별 키워드 추출 추가 (채용공고에서 개별 단어 추출)
        keywords.addAll(extractWordBasedKeywords(reqTxt, prefTxt));
        
        // 중복 제거 및 가중치 통합
        Map<String, Keyword> dedup = new LinkedHashMap<>();
        for (Keyword k : keywords) {
            String key = k.getTerm().toLowerCase();
            dedup.compute(key, (kk, old) -> {
                if (old == null) return k;
                return (old.getWeight() >= k.getWeight()) ? old : k;
            });
        }
        
        List<Keyword> finalKeywords = new ArrayList<>(dedup.values());
        logger.info("폴백 키워드 추출 완료: {}개", finalKeywords.size());
        
        // 추출된 키워드 상세 로그
        logger.info("=== 추출된 키워드 목록 ===");
        for (Keyword k : finalKeywords) {
            logger.info("키워드: {} | 가중치: {:.2f} | 종류: {}", k.getTerm(), k.getWeight(), k.getKind());
        }
        logger.info("=== 키워드 추출 완료 ===");
        
        return finalKeywords;
    }
    
    // 추가 키워드 추출 메서드 (더 세밀한 검색)
    private List<Keyword> extractAdditionalKeywords(String reqTxt, String prefTxt) {
        List<Keyword> additionalKeywords = new ArrayList<>();
        String combinedText = (reqTxt + " " + prefTxt).toLowerCase();
        
        // 추가 기술 키워드 패턴들 (더 세밀한 검색)
        String[] additionalPatterns = {
            "fastapi", "flask", "django", "celery",
            "k8s", "kubernetes", "docker", "jenkins",
            "llm", "rag", "agent", "ai", "ml", "machine learning",
            "tensorflow", "pytorch", "keras", "scikit-learn",
            "pandas", "numpy", "openai", "gpt", "bert",
            "transformer", "nlp", "computer vision",
            "end-to-end", "pipeline", "infrastructure",
            "api", "rest", "graphql", "microservice",
            "data analysis", "data science", "collaboration"
        };
        
        for (String pattern : additionalPatterns) {
            if (combinedText.contains(pattern)) {
                double weight = prefTxt.toLowerCase().contains(pattern) ? 0.8 : 0.6;
                // 원본 형태로 복원
                String originalTerm = pattern;
                if (pattern.equals("k8s")) originalTerm = "Kubernetes";
                else if (pattern.equals("llm")) originalTerm = "LLM";
                else if (pattern.equals("rag")) originalTerm = "RAG";
                else if (pattern.equals("ai")) originalTerm = "AI";
                else if (pattern.equals("ml")) originalTerm = "ML";
                else if (pattern.equals("api")) originalTerm = "API";
                else if (pattern.equals("rest")) originalTerm = "REST";
                else if (pattern.equals("nlp")) originalTerm = "NLP";
                else {
                    // 첫 글자 대문자로 변환
                    originalTerm = pattern.substring(0, 1).toUpperCase() + pattern.substring(1);
                }
                
                additionalKeywords.add(new Keyword(originalTerm, weight, Kind.TECH));
                logger.debug("추가 키워드: {} (가중치: {})", originalTerm, weight);
            }
        }
        
        return additionalKeywords;
    }
    
    // 단어별 키워드 추출 메서드 추가
    private List<Keyword> extractWordBasedKeywords(String reqTxt, String prefTxt) {
        List<Keyword> wordKeywords = new ArrayList<>();
        
        // 자격요건과 우대사항을 합쳐서 처리
        String combinedText = reqTxt + " " + prefTxt;
        
        // 특수문자 제거하고 단어로 분리
        String[] words = combinedText.replaceAll("[^a-zA-Z0-9가-힣\\s]", " ")
                                   .toLowerCase()
                                   .split("\\s+");
        
        // 단어별 빈도 계산
        Map<String, Integer> wordFreq = new HashMap<>();
        for (String word : words) {
            if (word.length() >= 2) { // 2글자 이상만
                wordFreq.put(word, wordFreq.getOrDefault(word, 0) + 1);
            }
        }
        
        // 빈도가 높고 기술 관련 단어들을 키워드로 추출
        for (Map.Entry<String, Integer> entry : wordFreq.entrySet()) {
            String word = entry.getKey();
            int freq = entry.getValue();
            
            // 기술 관련 단어 패턴 확인
            if (isTechRelatedWord(word) && freq >= 1) {
                // 우대사항에 있으면 더 높은 가중치
                double weight = prefTxt.toLowerCase().contains(word) ? 0.6 : 0.4;
                wordKeywords.add(new Keyword(word, weight, Kind.TECH));
                logger.debug("단어 기반 키워드: {} (빈도: {}, 가중치: {})", word, freq, weight);
            }
        }
        
        return wordKeywords;
    }
    
    // 기술 관련 단어인지 판단하는 메서드
    private boolean isTechRelatedWord(String word) {
        // 기술 관련 키워드 패턴들
        String[] techIndicators = {
            "java", "spring", "python", "javascript", "typescript", "react", "vue", "angular",
            "node", "express", "django", "flask", "mysql", "postgresql", "mongodb", "redis",
            "aws", "docker", "kubernetes", "jenkins", "git", "linux", "nginx", "apache",
            "html", "css", "sass", "webpack", "babel", "eslint", "prettier",
            "api", "rest", "graphql", "json", "xml", "yaml", "toml",
            "backend", "frontend", "fullstack", "devops", "database", "server", "client",
            "framework", "library", "tool", "platform", "service", "application"
        };
        
        for (String indicator : techIndicators) {
            if (word.contains(indicator) || indicator.contains(word)) {
                return true;
            }
        }
        
        return false;
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
        logger.info("포트폴리오 재정렬 시작: 기본 스킬 {}개, 프로젝트 {}개", base.getSkills().size(), base.getProjects().size());
        
        // (a) skills 재정렬: 매칭 점수가 높은 순으로 정렬
        List<String> skills = new ArrayList<>(base.getSkills());
        
        logger.debug("기본 스킬 목록: {}", skills);
        
        // 스킬별 매칭 점수 계산
        Map<String, Double> skillScores = new HashMap<>();
        for (String skill : skills) {
            double score = calculateSkillMatchScore(skill, keywords);
            skillScores.put(skill, score);
            logger.debug("스킬 점수: {} = {}", skill, score);
        }
        
        // 점수가 높은 순으로 정렬 (점수가 같으면 원래 순서 유지)
        skills.sort((s1, s2) -> {
            double score1 = skillScores.getOrDefault(s1, 0.0);
            double score2 = skillScores.getOrDefault(s2, 0.0);
            int scoreCompare = Double.compare(score2, score1);
            if (scoreCompare != 0) return scoreCompare;
            // 점수가 같으면 원래 순서 유지
            return Integer.compare(base.getSkills().indexOf(s1), base.getSkills().indexOf(s2));
        });
        
        logger.info("스킬 재정렬 완료: 총 {}개", skills.size());
        logger.info("=== 스킬 재정렬 결과 ===");
        for (String skill : skills) {
            double score = skillScores.get(skill);
            if (score > 0) {
                logger.info("스킬: {} | 매칭 점수: {:.2f} | 매칭됨", skill, score);
            } else {
                logger.info("스킬: {} | 매칭 점수: {:.2f} | 매칭 안됨", skill, score);
            }
        }
        logger.info("=== 스킬 재정렬 완료 ===");

        // (b) projects 재정렬: 매칭 점수가 높은 순으로 정렬
        List<PortfolioData.ProjectItem> projects = new ArrayList<>(base.getProjects());
        
        logger.debug("기본 프로젝트 목록: {}", projects.stream().map(p -> p.getTitle()).toList());
        
        // 프로젝트별 매칭 점수 계산
        Map<PortfolioData.ProjectItem, Double> projectScores = new HashMap<>();
        for (PortfolioData.ProjectItem project : projects) {
            double score = calculateProjectMatchScore(project, keywords);
            projectScores.put(project, score);
            logger.debug("프로젝트 점수: {} = {}", project.getTitle(), score);
        }
        
        // 점수가 높은 순으로 정렬 (점수가 같으면 원래 순서 유지)
        projects.sort((p1, p2) -> {
            double score1 = projectScores.getOrDefault(p1, 0.0);
            double score2 = projectScores.getOrDefault(p2, 0.0);
            int scoreCompare = Double.compare(score2, score1);
            if (scoreCompare != 0) return scoreCompare;
            // 점수가 같으면 원래 순서 유지
            return Integer.compare(base.getProjects().indexOf(p1), base.getProjects().indexOf(p2));
        });
        
        logger.info("프로젝트 재정렬 완료: 총 {}개", projects.size());
        logger.info("=== 프로젝트 재정렬 결과 ===");
        for (PortfolioData.ProjectItem project : projects) {
            double score = projectScores.get(project);
            if (score > 0) {
                logger.info("프로젝트: {} | 매칭 점수: {:.2f} | 매칭됨", project.getTitle(), score);
            } else {
                logger.info("프로젝트: {} | 매칭 점수: {:.2f} | 매칭 안됨", project.getTitle(), score);
            }
        }
        logger.info("=== 프로젝트 재정렬 완료 ===");

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

    // 개선된 토큰 매칭 메서드
    private boolean containsToken(String token, String needle) {
        if (!StringUtils.hasText(token) || !StringUtils.hasText(needle)) return false;
        
        String a = normalizeToken(token);
        String b = normalizeToken(needle);
        
        // 1. 완전 일치
        if (a.equals(b)) return true;
        
        // 2. 포함 관계 (더 유연하게)
        if (a.contains(b) || b.contains(a)) return true;
        
        // 3. 토큰 단위 비교 (예: spring boot == spring-boot)
        String[] tokensA = a.split("\\s+");
        String[] tokensB = b.split("\\s+");
        
        // 모든 B 토큰이 A에 포함되어 있는지 확인
        for (String tokenB : tokensB) {
            boolean found = false;
            for (String tokenA : tokensA) {
                if (tokenA.contains(tokenB) || tokenB.contains(tokenA)) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        
        return true;
    }
    
    // 토큰 정규화 메서드 추가
    private String normalizeToken(String token) {
        if (token == null) return "";
        
        return token.toLowerCase()
                   .replaceAll("[^a-z0-9+#\\.\\-]", " ")
                   .replaceAll("\\s+", " ")
                   .trim();
    }
    
    // 스킬 매칭 점수 계산 메서드 추가
    private double calculateSkillMatchScore(String skill, List<Keyword> keywords) {
        double totalScore = 0.0;
        List<String> matchedKeywords = new ArrayList<>();
        
        for (Keyword keyword : keywords) {
            if (keyword.getKind() == Kind.TECH && containsToken(skill, keyword.getTerm())) {
                totalScore += keyword.getWeight();
                matchedKeywords.add(keyword.getTerm() + "(" + String.format("%.2f", keyword.getWeight()) + ")");
                logger.debug("스킬 매칭: {} <-> {} (가중치: {})", skill, keyword.getTerm(), keyword.getWeight());
            }
        }
        
        if (!matchedKeywords.isEmpty()) {
            logger.info("스킬 매칭: {} | 점수: {:.2f} | 매칭 키워드: {}", skill, totalScore, String.join(", ", matchedKeywords));
        }
        
        return totalScore;
    }
    
    // 프로젝트 매칭 점수 계산 메서드 추가
    private double calculateProjectMatchScore(PortfolioData.ProjectItem project, List<Keyword> keywords) {
        double totalScore = 0.0;
        List<String> matchedTechs = new ArrayList<>();
        List<String> matchedTexts = new ArrayList<>();
        
        // 기술 스택 매칭
        for (String tech : project.getTechStack()) {
            for (Keyword keyword : keywords) {
                if (keyword.getKind() == Kind.TECH && containsToken(tech, keyword.getTerm())) {
                    totalScore += keyword.getWeight();
                    matchedTechs.add(tech + "->" + keyword.getTerm() + "(" + String.format("%.2f", keyword.getWeight()) + ")");
                    logger.debug("프로젝트 기술 매칭: {} <-> {} (가중치: {})", tech, keyword.getTerm(), keyword.getWeight());
                }
            }
        }
        
        // 프로젝트 제목, 설명, 역할에서도 키워드 매칭
        String projectText = (project.getTitle() + " " + project.getSummary() + " " + project.getRole()).toLowerCase();
        for (Keyword keyword : keywords) {
            if (keyword.getKind() == Kind.TECH || keyword.getKind() == Kind.ROLE) {
                if (projectText.contains(keyword.getTerm().toLowerCase())) {
                    double textWeight = keyword.getWeight() * 0.5; // 텍스트 매칭은 가중치를 절반으로
                    totalScore += textWeight;
                    matchedTexts.add(keyword.getTerm() + "(" + String.format("%.2f", textWeight) + ")");
                    logger.debug("프로젝트 텍스트 매칭: {} <-> {} (가중치: {})", project.getTitle(), keyword.getTerm(), textWeight);
                }
            }
        }
        
        if (!matchedTechs.isEmpty() || !matchedTexts.isEmpty()) {
            logger.info("프로젝트 매칭: {} | 점수: {:.2f} | 기술매칭: {} | 텍스트매칭: {}", 
                project.getTitle(), totalScore, 
                matchedTechs.isEmpty() ? "없음" : String.join(", ", matchedTechs),
                matchedTexts.isEmpty() ? "없음" : String.join(", ", matchedTexts));
        }
        
        return totalScore;
    }
}