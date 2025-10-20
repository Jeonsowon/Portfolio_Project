package com.example.portfolioai.portfolio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    List<Portfolio> findByOwnerEmailOrderByUpdatedAtDesc(String ownerEmail);
    List<Portfolio> findByOwnerEmailAndKindOrderByUpdatedAtDesc(String ownerEmail, Portfolio.Kind kind);
}