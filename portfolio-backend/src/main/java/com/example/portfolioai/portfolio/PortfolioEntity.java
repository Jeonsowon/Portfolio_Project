// src/main/java/com/example/portfolioai/portfolio/PortfolioEntity.java
package com.example.portfolioai.portfolio;

import java.time.Instant;

import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "portfolio")
@Access(AccessType.FIELD) // ✅ 필드 기반 매핑으로 고정
public class PortfolioEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_email", nullable = false, length = 190)
    private String ownerEmail;

    public enum Kind { BASIC, REMODEL }

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 16)
    private Kind kind;

    // ✅ 여기 '한 번만' 매핑합니다. (게터/세터에는 @Column 붙이지 마세요)
    @Column(name = "data_json", nullable = false, columnDefinition = "text")
    private String dataJson;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // --- 기본 생성자
    public PortfolioEntity() {}

    // --- getters/setters (어노테이션 없음!)
    public Long getId() { return id; }
    public String getOwnerEmail() { return ownerEmail; }
    public void setOwnerEmail(String ownerEmail) { this.ownerEmail = ownerEmail; }

    public Kind getKind() { return kind; }
    public void setKind(Kind kind) { this.kind = kind; }

    public String getDataJson() { return dataJson; }
    public void setDataJson(String dataJson) { this.dataJson = dataJson; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}