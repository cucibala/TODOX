package com.x.todox.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public final class BcryptTool {

    private BcryptTool() {
    }

    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("123123");
        System.out.println(hash);
    }
}
