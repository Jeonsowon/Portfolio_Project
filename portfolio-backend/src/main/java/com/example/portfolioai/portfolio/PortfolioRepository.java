package com.example.portfolioai.portfolio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioRepository extends JpaRepository<PortfolioEntity, Long> {
    Optional<PortfolioEntity> findByIdAndOwnerEmail(Long id, String ownerEmail);
    
    List<PortfolioEntity> findByOwnerEmailOrderByUpdatedAtDesc(String ownerEmail);

    List<PortfolioEntity> findByOwnerEmailAndKindOrderByUpdatedAtDesc(
        String ownerEmail,
        PortfolioEntity.Kind kind
    );
}