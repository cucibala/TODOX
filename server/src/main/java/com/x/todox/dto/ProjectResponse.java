package com.x.todox.dto;

public class ProjectResponse {

    private String id;
    private Long orgId;
    private String name;
    private String color;
    private String icon;
    private String groupId;
    private String priority;
    private Integer order;
    private String createdAt;
    private String updatedAt;

    public String getId() {
        return id;
    }

    public Long getOrgId() {
        return orgId;
    }

    public String getName() {
        return name;
    }

    public String getColor() {
        return color;
    }

    public String getIcon() {
        return icon;
    }

    public String getGroupId() {
        return groupId;
    }

    public String getPriority() {
        return priority;
    }

    public Integer getOrder() {
        return order;
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

    public void setColor(String color) {
        this.color = color;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public void setOrder(Integer order) {
        this.order = order;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
