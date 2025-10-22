package com.example.portfolioai.portfolio;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/portfolios")
public class PortfolioController {

    private final PortfolioRepository repo;
    private final ObjectMapper om;

    public PortfolioController(PortfolioRepository repo, ObjectMapper om) {
        this.repo = repo;
        this.om = om;
    }

    // ✅ 목록: flat 배열 반환 [{id,kind,title,updatedAt}]
    @GetMapping("/my")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Authentication auth) throws Exception {
        String email = auth.getName();
        List<Portfolio> all = repo.findByOwnerEmailOrderByUpdatedAtDesc(email);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Portfolio p : all) {
            Map<?,?> data = safeRead(p.getDataJson());
            String title = buildTitleFromData(data, p.getId());
            out.add(Map.of(
                "id", p.getId(),
                "kind", p.getKind().name(),
                "title", title,
                "updatedAt", p.getUpdatedAt().toString()
            ));
        }
        return out;
    }

    // ✅ 상세
    @GetMapping("/{id:\\d+}")
    @Transactional(readOnly = true)
    public Map<String, Object> detail(@PathVariable Long id, Authentication auth) throws Exception {
        Portfolio p = repo.findById(id).orElseThrow();
        if (!p.getOwnerEmail().equals(auth.getName())) throw new RuntimeException("forbidden");
        return Map.of(
            "id", p.getId(),
            "kind", p.getKind().name(),
            "data", safeRead(p.getDataJson())
        );
    }

    // ✅ 기본 템플릿 생성 (id 발급)
    @PostMapping("/create-default")
    @Transactional
    public Map<String, Object> createDefault(@RequestBody Map<String, String> body, Authentication auth) throws Exception {
        String email = auth.getName();
        Portfolio.Kind kind = Portfolio.Kind.valueOf(body.getOrDefault("kind", "BASIC"));

        Map<String, Object> data = defaultData();

        Portfolio p = new Portfolio();
        p.setOwnerEmail(email);
        p.setKind(kind);
        p.setDataJson(om.writeValueAsString(data));
        p.setUpdatedAt(Instant.now());
        repo.save(p);

        return Map.of("id", p.getId(), "kind", p.getKind().name(), "data", data);
    }

    // ✅ 저장(업데이트)
    @PutMapping("/{id:\\d+}")
    @Transactional
    public Map<String, Object> save(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) throws Exception {
        Portfolio p = repo.findById(id).orElseThrow();
        if (!p.getOwnerEmail().equals(auth.getName())) throw new RuntimeException("forbidden");
        Object data = body.get("data");
        p.setDataJson(om.writeValueAsString(data));
        p.setUpdatedAt(Instant.now());
        repo.save(p);
        return Map.of("ok", true, "id", p.getId());
    }

    // ✅ 삭제    
    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Map<String, Object>> deletePortfolio(@PathVariable Long id, Authentication auth) {
        String email = auth.getName();

        Portfolio pf = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 포트폴리오"));

        if (!pf.getOwnerEmail().equals(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "삭제 권한이 없습니다.");
        }

        repo.delete(pf);
        return ResponseEntity.ok(Map.of("ok", true, "message", "삭제되었습니다."));
    }

    /* ===== helpers ===== */

    private Map<String, Object> defaultData() {
        Map<String, Object> data = new HashMap<>();
        data.put("name", "");
        data.put("role", "");
        data.put("contacts", List.of());
        data.put("introduction", "");
        data.put("skills", List.of());
        data.put("experiences", List.of());
        data.put("projects", List.of(
            Map.of("title","", "description","", "link","", "techs", List.of(), "images", List.of())
        ));
        return data;
    }

    private Map<String,Object> safeRead(String json) {
        try { return om.readValue(json, Map.class); }
        catch (Exception e) { return Map.of(); }
    }

    private String buildTitleFromData(Map<?,?> data, Long id) {
        Object name = data.get("name");
        Object role = data.get("role");
        String base = (name != null ? name.toString() : "").trim();
        String sub  = (role != null ? role.toString() : "").trim();
        String title = base.isEmpty() && sub.isEmpty()
                ? "포트폴리오 #" + id
                : (base + (sub.isEmpty() ? "" : " - " + sub));
        return title;
    }
}