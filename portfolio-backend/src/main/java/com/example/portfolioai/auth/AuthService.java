package com.example.portfolioai.auth;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.portfolioai.auth.AuthDtos.AuthRes;
import com.example.portfolioai.auth.AuthDtos.LoginReq;
import com.example.portfolioai.auth.AuthDtos.RegisterReq;
import com.example.portfolioai.user.User;
import com.example.portfolioai.user.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<JwtService> jwtServiceProvider; // ✅ JWT 없어도 동작

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       ObjectProvider<JwtService> jwtServiceProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtServiceProvider = jwtServiceProvider;
    }

    @Transactional
    public AuthRes register(RegisterReq req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }
        User u = new User();
        u.setName(req.getName());
        u.setEmail(req.getEmail());
        u.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        userRepository.save(u);

        String token = tryGenerateToken(u.getEmail()); // 없으면 null
        return new AuthRes(token, u.getEmail(), u.getName());
    }

    @Transactional
    public AuthRes login(LoginReq req) {
        User u = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일/비밀번호가 올바르지 않습니다.")
                );

        // ✅ matches(raw, encoded) 순서 주의
        if (!passwordEncoder.matches(req.getPassword(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일/비밀번호가 올바르지 않습니다.");
        }

        String token = tryGenerateToken(u.getEmail()); // 없으면 null (프론트는 token 유무로 분기)
        return new AuthRes(token, u.getEmail(), u.getName());
    }

    private String tryGenerateToken(String email) {
        try {
            JwtService js = jwtServiceProvider.getIfAvailable();
            if (js == null) return null;              // JWT 미구성 → 로그인은 성공, 토큰은 null
            return js.generateToken(email);
        } catch (Exception e) {
            // 개발 중엔 콘솔에만 남기고 토큰 없이 진행
            System.err.println("JWT generate failed: " + e.getMessage());
            return null;
        }
    }
}