package com.x.todox.dto;

public class AdminLoginResponse {

    private String username;

    public AdminLoginResponse() {
    }

    public AdminLoginResponse(String username) {
        this.username = username;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
