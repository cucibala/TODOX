package com.x.todox.dto;

import javax.validation.constraints.NotBlank;

public class AdminCreateOrgRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String account;

    @NotBlank
    private String password;

    public String getName() {
        return name;
    }

    public String getAccount() {
        return account;
    }

    public String getPassword() {
        return password;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAccount(String account) {
        this.account = account;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
