// src/main/java/com/example/portfolioai/controller/RemodelController.java
package com.example.portfolioai.controller;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.portfolioai.dto.BuildRemodelReq;
import com.example.portfolioai.dto.PortfolioData;
import com.example.portfolioai.portfolio.PortfolioEntity;
import com.example.portfolioai.portfolio.PortfolioRepository;
import com.example.portfolioai.service.RemodelBuildService;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/remodel")
public class RemodelController {

    private final RemodelBuildService service;
    private final PortfolioRepository portfolioRepo;
    private final ObjectMapper om;

    public RemodelController(RemodelBuildService service, PortfolioRepository portfolioRepo, ObjectMapper om) {
        this.service = service;
        this.portfolioRepo = portfolioRepo;
        this.om = om;
    }

    @PostMapping("/build")
    @Transactional
    public ResponseEntity<Map<String, Object>> build(@RequestBody BuildRemodelReq req, Authentication auth) throws Exception {
        String email = auth.getName();

        // 0. 기본 포트폴리오 검증 (권한/존재)
        PortfolioEntity basePortfolio = portfolioRepo.findById(req.getBasePortfolioId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "기본 포트폴리오를 찾을 수 없습니다."));
        if (!basePortfolio.getOwnerEmail().equals(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "기본 포트폴리오에 대한 권한이 없습니다.");
        }

        // 1. Service로 리모델링된 포트폴리오 생성 (백엔드 DTO + 키워드)
        var outcome = service.buildRemodelOutcome(req);
        PortfolioData result = outcome.getData();
        var keywords = outcome.getKeywords();

        // 1-1. 프론트엔드 스키마로 변환 (기존 항목 보존 & 순서만 변경)
        java.util.Map<String,Object> baseFe = om.readValue(basePortfolio.getDataJson(), java.util.Map.class);

        // skills: 문자열 비교로 재정렬했으므로, 기존 FE 스킬 아이콘을 유지하면서 순서만 반영
        java.util.List<java.util.Map<String,Object>> baseSkills = (java.util.List<java.util.Map<String,Object>>) baseFe.getOrDefault("skills", java.util.List.of());
        java.util.Map<String,java.util.Map<String,Object>> nameToSkill = new java.util.LinkedHashMap<>();
        for (var s : baseSkills) {
            Object n = s.get("name");
            if (n != null) nameToSkill.put(n.toString().toLowerCase(), s);
        }
        java.util.List<java.util.Map<String,Object>> feSkills = new java.util.ArrayList<>();
        for (String s : result.getSkills()) {
            var keep = nameToSkill.getOrDefault(s.toLowerCase(), java.util.Map.of("name", s, "icon", ""));
            feSkills.add(keep);
        }

        // projects: 기존 images/link 유지, 순서만 반영
        java.util.List<java.util.Map<String,Object>> baseProjects = (java.util.List<java.util.Map<String,Object>>) baseFe.getOrDefault("projects", java.util.List.of());
        java.util.Map<String,java.util.Map<String,Object>> titleToProject = new java.util.LinkedHashMap<>();
        for (var p : baseProjects) {
            Object t = p.get("title");
            if (t != null) titleToProject.put(t.toString(), p);
        }
        java.util.List<java.util.Map<String,Object>> feProjects = new java.util.ArrayList<>();
        for (var p : result.getProjects()) {
            var baseP = titleToProject.get(p.getTitle());
            java.util.Map<String,Object> merged = new java.util.HashMap<>();
            merged.put("title", p.getTitle());
            merged.put("teamSize", baseP != null ? baseP.get("teamSize") : null);
            merged.put("myRole", p.getRole());
            merged.put("contributions", baseP != null ? baseP.getOrDefault("contributions", java.util.List.of()) : java.util.List.of());
            merged.put("description", p.getSummary());
            merged.put("link", baseP != null ? baseP.get("link") : p.getLink());
            merged.put("techs", p.getTechStack());
            merged.put("images", baseP != null ? baseP.getOrDefault("images", java.util.List.of()) : java.util.List.of());
            feProjects.add(merged);
        }

        // 나머지 섹션: 기존 순서를 기본으로, 키워드 매칭이 많은 것을 앞으로
        java.util.function.Function<Object, Double> textScore = (obj) -> {
            String txt = obj == null ? "" : obj.toString();
            double sc = 0.0;
            for (var k : keywords) {
                if (k.getKind() == com.example.portfolioai.dto.Keyword.Kind.TECH || k.getKind() == com.example.portfolioai.dto.Keyword.Kind.ROLE) {
                    if (txt.toLowerCase().contains(k.getTerm().toLowerCase())) sc += k.getWeight();
                }
            }
            return sc;
        };

        java.util.Comparator<java.util.Map<String,Object>> cmpByScore = java.util.Comparator.comparingDouble((java.util.Map<String,Object> m) -> {
            String joined = om.valueToTree(m).toString();
            return textScore.apply(joined);
        }).reversed();

        java.util.List<java.util.Map<String,Object>> contacts = new java.util.ArrayList<>((java.util.List<java.util.Map<String,Object>>) baseFe.getOrDefault("contacts", java.util.List.of()));
        contacts.sort(cmpByScore);
        java.util.List<java.util.Map<String,Object>> educations = new java.util.ArrayList<>((java.util.List<java.util.Map<String,Object>>) baseFe.getOrDefault("educations", java.util.List.of()));
        educations.sort(cmpByScore);
        java.util.List<java.util.Map<String,Object>> experiences = new java.util.ArrayList<>((java.util.List<java.util.Map<String,Object>>) baseFe.getOrDefault("experiences", java.util.List.of()));
        experiences.sort(cmpByScore);
        java.util.List<java.util.Map<String,Object>> certifications = new java.util.ArrayList<>((java.util.List<java.util.Map<String,Object>>) baseFe.getOrDefault("certifications", java.util.List.of()));
        certifications.sort(cmpByScore);
        java.util.List<java.util.Map<String,Object>> awards = new java.util.ArrayList<>((java.util.List<java.util.Map<String,Object>>) baseFe.getOrDefault("awards", java.util.List.of()));
        awards.sort(cmpByScore);

        java.util.Map<String, Object> feData = new java.util.LinkedHashMap<>();
        feData.put("name", result.getName());
        feData.put("role", result.getRole());
        feData.put("contacts", contacts);
        feData.put("introduction", result.getIntroduction());
        feData.put("skills", feSkills);
        feData.put("experiences", experiences);
        feData.put("projects", feProjects);
        feData.put("educations", educations);
        feData.put("certifications", certifications);
        feData.put("awards", awards);
        // 제목(title)도 함께 저장 (없으면 name/role로 대체 가능)
        if (req.getTitle() != null && !req.getTitle().isBlank()) {
            feData.put("title", req.getTitle().trim());
        }

        // 3. REMODEL 종류로 새로운 포트폴리오 생성
        PortfolioEntity remodelPortfolio = new PortfolioEntity();
        remodelPortfolio.setOwnerEmail(email);
        remodelPortfolio.setKind(PortfolioEntity.Kind.REMODEL);
        remodelPortfolio.setDataJson(om.writeValueAsString(feData));
        remodelPortfolio.setUpdatedAt(Instant.now());
        
        PortfolioEntity saved = portfolioRepo.save(remodelPortfolio);

        // 4. 반환값 구성
        return ResponseEntity.ok(Map.of(
            "id", saved.getId(),
            "kind", saved.getKind().name(),
            "data", feData
        ));
    }
}