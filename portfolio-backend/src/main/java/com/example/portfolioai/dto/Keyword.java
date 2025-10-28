// src/main/java/com/example/portfolioai/dto/Keyword.java
package com.example.portfolioai.dto;

public class Keyword {
    public enum Kind { TECH, ROLE, ETC }

    private String term;    // 예: Spring Boot, AWS, 백엔드
    private double weight;  // 0.0~1.0
    private Kind kind;      // 기술/역할/기타

    public Keyword() {}

    public Keyword(String term, double weight, Kind kind) {
        this.term = term;
        this.weight = weight;
        this.kind = kind;
    }

    public String getTerm() { return term; }
    public double getWeight() { return weight; }
    public Kind getKind() { return kind; }

    public void setTerm(String term) { this.term = term; }
    public void setWeight(double weight) { this.weight = weight; }
    public void setKind(Kind kind) { this.kind = kind; }
}
