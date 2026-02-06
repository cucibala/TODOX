package com.x.todox.dto;

public class AdminMemberSummaryResponse {

    private String id;
    private Long orgId;
    private String name;
    private String role;
    private String createdAt;
    private String updatedAt;

    public AdminMemberSummaryResponse() {
    }

    public AdminMemberSummaryResponse(String id, Long orgId, String name, String role, String createdAt, String updatedAt) {
        this.id = id;
        this.orgId = orgId;
        this.name = name;
        this.role = role;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public Long getOrgId() {
        return orgId;
    }

    public String getName() {
        return name;
    }

    public String getRole() {
        return role;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
