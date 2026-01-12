package com.x.todox.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class ProjectGroupCreateRequest {

    @NotNull
    private Long orgId;

    @NotNull
    private Long creatorId;

    @NotBlank
    private String name;

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

    public void setOrder(Integer order) {
        this.order = order;
    }
}
