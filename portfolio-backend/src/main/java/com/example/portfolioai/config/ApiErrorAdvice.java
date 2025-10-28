// src/main/java/com/example/portfolioai/config/ApiErrorAdvice.java
package com.example.portfolioai.config;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiErrorAdvice {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String,Object>> handle(Exception e){
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("ok", false, "message", e.getMessage()));
    }
}