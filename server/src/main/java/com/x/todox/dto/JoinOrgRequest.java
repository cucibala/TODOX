package com.x.todox.dto;

import javax.validation.constraints.NotBlank;

public class JoinOrgRequest {

    @NotBlank
    private String orgAccount;

    @NotBlank
    private String orgPassword;

    @NotBlank
    private String memberName;

    public String getOrgAccount() {
        return orgAccount;
    }

    public String getOrgPassword() {
        return orgPassword;
    }

    public String getMemberName() {
        return memberName;
    }

    public void setOrgAccount(String orgAccount) {
        this.orgAccount = orgAccount;
    }

    public void setOrgPassword(String orgPassword) {
        this.orgPassword = orgPassword;
    }

    public void setMemberName(String memberName) {
        this.memberName = memberName;
    }
}
