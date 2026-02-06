package com.x.todox.dto;

public class AdminProjectSummaryResponse {

    private String id;
    private Long orgId;
    private String name;
    private String groupId;
    private String priority;
    private String createdAt;
    private String updatedAt;

    public AdminProjectSummaryResponse() {
    }

    public AdminProjectSummaryResponse(String id,
                                       Long orgId,
                                       String name,
                                       String groupId,
                                       String priority,
                                       String createdAt,
                                       String updatedAt) {
        this.id = id;
        this.orgId = orgId;
        this.name = name;
        this.groupId = groupId;
        this.priority = priority;
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

    public String getGroupId() {
        return groupId;
    }

    public String getPriority() {
        return priority;
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

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
