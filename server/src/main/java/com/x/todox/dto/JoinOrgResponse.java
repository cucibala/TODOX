package com.x.todox.dto;

import com.x.todox.enums.MemberRole;

public class JoinOrgResponse {

    private Long orgId;
    private Long memberId;
    private String memberName;
    private MemberRole role;

    public JoinOrgResponse(Long orgId, Long memberId, String memberName, MemberRole role) {
        this.orgId = orgId;
        this.memberId = memberId;
        this.memberName = memberName;
        this.role = role;
    }

    public Long getOrgId() {
        return orgId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getMemberName() {
        return memberName;
    }

    public MemberRole getRole() {
        return role;
    }

    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public void setMemberName(String memberName) {
        this.memberName = memberName;
    }

    public void setRole(MemberRole role) {
        this.role = role;
    }
}
