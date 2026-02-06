package com.x.todox.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class ImageUploadRequest {

    @NotNull
    private Long orgId;

    @NotBlank
    private String memberId;

    @NotBlank
    private String dataUrl;

    public Long getOrgId() {
        return orgId;
    }

    public String getMemberId() {
        return memberId;
    }

    public String getDataUrl() {
        return dataUrl;
    }

    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }

    public void setMemberId(String memberId) {
        this.memberId = memberId;
    }

    public void setDataUrl(String dataUrl) {
        this.dataUrl = dataUrl;
    }
}
