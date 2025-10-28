// src/main/java/com/example/portfolioai/controller/RemodelController.java
package com.example.portfolioai.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.portfolioai.dto.BuildRemodelReq;
import com.example.portfolioai.dto.PortfolioData;
import com.example.portfolioai.service.RemodelBuildService;

@RestController
@RequestMapping("/api/v1/remodel")
public class RemodelController {

    private final RemodelBuildService service;

    public RemodelController(RemodelBuildService service) {
        this.service = service;
    }

    @PostMapping("/build")
    public ResponseEntity<PortfolioData> build(@RequestBody BuildRemodelReq req) {
        // 예외 발생 시 Service에서 ResponseStatusException 처리
        PortfolioData result = service.buildRemodelSync(req);
        return ResponseEntity.ok(result);
    }
}