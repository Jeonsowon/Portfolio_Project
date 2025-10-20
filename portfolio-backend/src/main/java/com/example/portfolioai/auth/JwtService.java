package com.example.portfolioai.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.io.DecodingException;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey key;
    private final long ttlMillis;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.ttlMillis:3600000}") long ttlMillis) {
        this.key = buildKey(secret);
        this.ttlMillis = ttlMillis;
    }

    private SecretKey buildKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("JWT secret is empty");
        }
        // 1) Base64 로 제공됐다면 그대로 사용
        try {
            byte[] decoded = Decoders.BASE64.decode(secret.trim());
            return Keys.hmacShaKeyFor(decoded);
        } catch (DecodingException | IllegalArgumentException e) {
            // 2) Base64가 아니면 문자열을 SHA-256으로 해시해서 32바이트 키로 파생
            try {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                byte[] hashed = md.digest(secret.getBytes(StandardCharsets.UTF_8));
                return Keys.hmacShaKeyFor(hashed);
            } catch (Exception ex) {
                throw new RuntimeException("Failed to build JWT key", ex);
            }
        }
    }
    
    public String generateToken(String email) {
        if (email == null) return null;
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(email)                              // 0.11.x
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusMillis(ttlMillis)))
                .signWith(key, SignatureAlgorithm.HS256)        // 0.11.x
                .compact();
    }

    public String extractEmail(String token) {
        if (token == null) return null;
        Claims claims = Jwts.parserBuilder()                    // 0.11.x
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }

    public boolean isTokenValid(String token, String email) {
        try {
            String sub = extractEmail(token);
            return sub != null && sub.equals(email);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}