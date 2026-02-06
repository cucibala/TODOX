package com.x.todox.dto;

public class AdminOrgSummaryResponse {

    private Long id;
    private String name;
    private String account;
    private String createdAt;

    public AdminOrgSummaryResponse() {
    }

    public AdminOrgSummaryResponse(Long id, String name, String account, String createdAt) {
        this.id = id;
        this.name = name;
        this.account = account;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getAccount() {
        return account;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAccount(String account) {
        this.account = account;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
