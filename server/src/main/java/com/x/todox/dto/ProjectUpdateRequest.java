package com.x.todox.dto;

import javax.validation.constraints.NotNull;

public class ProjectUpdateRequest {

    @NotNull
    private Long updaterId;

    private String name;
    private String color;
    private String icon;
    private String groupId;
    private String priority;
    private Integer order;

    public Long getUpdaterId() {
        return updaterId;
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

    public void setUpdaterId(Long updaterId) {
        this.updaterId = updaterId;
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
