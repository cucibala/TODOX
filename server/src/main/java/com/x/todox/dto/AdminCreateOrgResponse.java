package com.x.todox.dto;

public class AdminCreateOrgResponse {

    private Long orgId;
    private String name;
    private String account;

    public AdminCreateOrgResponse() {
    }

    public AdminCreateOrgResponse(Long orgId, String name, String account) {
        this.orgId = orgId;
        this.name = name;
        this.account = account;
    }

    public Long getOrgId() {
        return orgId;
    }

    public String getName() {
        return name;
    }

    public String getAccount() {
        return account;
    }

    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAccount(String account) {
        this.account = account;
    }
}
