package com.x.todox.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class ImageUploadRequest {

    @NotNull
    private Long orgId;

    @NotNull
    private Long memberId;

    @NotBlank
    private String dataUrl;

    public Long getOrgId() {
        return orgId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getDataUrl() {
        return dataUrl;
    }

    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public void setDataUrl(String dataUrl) {
        this.dataUrl = dataUrl;
    }
}
