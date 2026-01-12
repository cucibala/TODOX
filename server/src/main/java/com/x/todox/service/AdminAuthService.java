package com.x.todox.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService {

    private final String username;
    private final String passwordHash;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AdminAuthService(@Value("${todox.admin.username:admin}") String username,
                            @Value("${todox.admin.password-hash:}") String passwordHash) {
        this.username = username;
        this.passwordHash = passwordHash;
    }

    public boolean isConfigured() {
        return passwordHash != null && !passwordHash.trim().isEmpty();
    }

    public String getUsername() {
        return username;
    }

    public boolean authenticate(String inputUsername, String inputPassword) {
        if (!isConfigured()) {
            throw new IllegalArgumentException("管理员密码未配置");
        }
        if (inputUsername == null || inputPassword == null) {
            return false;
        }
        if (!username.equals(inputUsername)) {
            return false;
        }
        return passwordEncoder.matches(inputPassword, passwordHash);
    }
}
