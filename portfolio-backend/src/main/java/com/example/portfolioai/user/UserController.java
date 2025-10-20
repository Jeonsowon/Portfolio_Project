// src/main/java/.../user/UserController.java
package com.example.portfolioai.user;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class UserController {

    private final UserRepository userRepository;
    public UserController(UserRepository userRepository) { this.userRepository = userRepository; }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        if (auth == null || auth.getName() == null) return ResponseEntity.status(401).build();
        return userRepository.findByEmail(auth.getName())
                .map(u -> ResponseEntity.ok(Map.of(
                        "email", u.getEmail(),
                        "name", u.getName()
                )))
                .orElseGet(() -> ResponseEntity.status(401).build());
    }
}