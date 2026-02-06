package com.x.todox.dto;

import javax.validation.constraints.NotBlank;

public class AdminCreateOrgRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String account;

    public String getName() {
        return name;
    }

    public String getAccount() {
        return account;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAccount(String account) {
        this.account = account;
    }

}
