package com.x.todox.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class ProjectCreateRequest {

    @NotNull
    private Long orgId;

    @NotNull
    private Long creatorId;

    @NotBlank
    private String name;

    private String color;
    private String icon;
    private String groupId;
    private String priority;
    private Integer order;

    public Long getOrgId() {
        return orgId;
    }

    public Long getCreatorId() {
        return creatorId;
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

    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }

    public void setCreatorId(Long creatorId) {
        this.creatorId = creatorId;
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
}
