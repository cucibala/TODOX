package com.x.todox.dto;

import com.x.todox.enums.MemberRole;

public class OrgMemberResponse {

    private Long id;
    private Long orgId;
    private String name;
    private MemberRole role;
    private String createdAt;

    public Long getId() {
        return id;
    }

    public Long getOrgId() {
        return orgId;
    }

    public String getName() {
        return name;
    }

    public MemberRole getRole() {
        return role;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setRole(MemberRole role) {
        this.role = role;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
