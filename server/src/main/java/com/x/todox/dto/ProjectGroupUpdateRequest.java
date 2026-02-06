package com.x.todox.dto;

import javax.validation.constraints.NotBlank;

public class ProjectGroupUpdateRequest {

    @NotBlank
    private String updaterId;

    private String name;
    private Integer order;

    public String getUpdaterId() {
        return updaterId;
    }

    public String getName() {
        return name;
    }

    public Integer getOrder() {
        return order;
    }

    public void setUpdaterId(String updaterId) {
        this.updaterId = updaterId;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setOrder(Integer order) {
        this.order = order;
    }
}
