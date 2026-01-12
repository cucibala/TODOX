package com.x.todox.dto;

import javax.validation.constraints.NotNull;

public class ProjectGroupUpdateRequest {

    @NotNull
    private Long updaterId;

    private String name;
    private Integer order;

    public Long getUpdaterId() {
        return updaterId;
    }

    public String getName() {
        return name;
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

    public void setOrder(Integer order) {
        this.order = order;
    }
}
