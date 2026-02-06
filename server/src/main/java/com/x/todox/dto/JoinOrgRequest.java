package com.x.todox.dto;

import javax.validation.constraints.NotBlank;

public class JoinOrgRequest {

    @NotBlank
    private String orgAccount;

    @NotBlank
    private String memberId;

    @NotBlank
    private String memberPassword;

    public String getOrgAccount() {
        return orgAccount;
    }

    public String getMemberId() {
        return memberId;
    }

    public String getMemberPassword() {
        return memberPassword;
    }

    public void setOrgAccount(String orgAccount) {
        this.orgAccount = orgAccount;
    }

    public void setMemberId(String memberId) {
        this.memberId = memberId;
    }

    public void setMemberPassword(String memberPassword) {
        this.memberPassword = memberPassword;
    }
}
