package com.example.portfolioai.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthDtos {

    public static class LoginReq {
        @Email @NotBlank
        private String email;
        @NotBlank
        private String password;

        public LoginReq() {}
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class RegisterReq {
        @NotBlank
        private String name;
        @Email @NotBlank
        private String email;
        @NotBlank
        private String password;

        public RegisterReq() {}
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class AuthRes {
        private String token;
        private String email;
        private String name;

        public AuthRes() {}
        public AuthRes(String token, String email, String name) {
            this.token = token; this.email = email; this.name = name;
        }
        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }
}