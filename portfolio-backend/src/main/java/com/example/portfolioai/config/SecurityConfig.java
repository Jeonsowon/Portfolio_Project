package com.example.portfolioai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.portfolioai.auth.JwtService;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfig {

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwtService) {
        return new JwtAuthenticationFilter(jwtService);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        http
          .csrf(csrf -> csrf.disable())
          .cors(cors -> {}) // CORS 설정 별도 bean과 연결됨
          .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
          .authorizeHttpRequests(auth -> auth
              .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
              .requestMatchers("/error").permitAll()
              .requestMatchers(HttpMethod.POST, "/api/v1/auth/**").permitAll()
              .requestMatchers(HttpMethod.POST, "/api/v1/remodel/debug").permitAll()
              .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
              .anyRequest().authenticated()
          )
          .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)

          .exceptionHandling(ex -> ex
              .authenticationEntryPoint((request, response, authEx) ->
                  response.sendError(HttpServletResponse.SC_UNAUTHORIZED))
              .accessDeniedHandler((request, response, accessEx) ->
                  response.sendError(HttpServletResponse.SC_FORBIDDEN))
          );
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}