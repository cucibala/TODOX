package com.x.todox.service;

import com.x.todox.dto.JoinOrgRequest;
import com.x.todox.dto.JoinOrgResponse;
import com.x.todox.dto.OrgMemberResponse;
import com.x.todox.entity.OrgMember;
import com.x.todox.entity.Organization;
import com.x.todox.repository.OrgMemberRepository;
import com.x.todox.repository.OrganizationRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrgMemberRepository orgMemberRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public OrganizationService(OrganizationRepository organizationRepository,
                               OrgMemberRepository orgMemberRepository) {
        this.organizationRepository = organizationRepository;
        this.orgMemberRepository = orgMemberRepository;
    }

    @Transactional
    public JoinOrgResponse joinOrganization(JoinOrgRequest request) {
        Organization organization = organizationRepository.findByAccount(request.getOrgAccount())
            .orElseThrow(() -> new IllegalArgumentException("组织账号不存在"));

        OrgMember member = orgMemberRepository.findByIdAndOrganizationId(request.getMemberId(), organization.getId())
            .orElseThrow(() -> new IllegalArgumentException("成员不存在"));
        if (member.getPasswordHash() == null || member.getPasswordHash().isEmpty()) {
            throw new IllegalArgumentException("成员密码未设置");
        }
        if (!passwordEncoder.matches(request.getMemberPassword(), member.getPasswordHash())) {
            throw new IllegalArgumentException("成员账号或密码错误");
        }

        return new JoinOrgResponse(
            organization.getId(),
            member.getId(),
            member.getName(),
            member.getRole()
        );
    }

    @Transactional(readOnly = true)
    public List<OrgMemberResponse> listMembers(Long orgId, String requesterId) {
        OrgMember requester = orgMemberRepository.findByIdAndOrganizationId(requesterId, orgId)
            .orElseThrow(() -> new IllegalArgumentException("成员不存在"));

        return orgMemberRepository.findByOrganizationId(orgId).stream()
            .map(member -> {
                OrgMemberResponse response = new OrgMemberResponse();
                response.setId(member.getId());
                response.setOrgId(member.getOrganization().getId());
                response.setName(member.getName());
                response.setRole(member.getRole());
                response.setCreatedAt(member.getCreatedAt());
                return response;
            })
            .collect(Collectors.toList());
    }

    @Transactional
    public void updateMemberPassword(Long orgId, String memberId, String oldPassword, String newPassword) {
        OrgMember member = orgMemberRepository.findByIdAndOrganizationId(memberId, orgId)
            .orElseThrow(() -> new IllegalArgumentException("成员不存在"));
        if (member.getPasswordHash() == null || member.getPasswordHash().isEmpty()) {
            throw new IllegalArgumentException("成员密码未设置");
        }
        if (!passwordEncoder.matches(oldPassword, member.getPasswordHash())) {
            throw new IllegalArgumentException("原密码不正确");
        }
        member.setPasswordHash(passwordEncoder.encode(newPassword));
        orgMemberRepository.save(member);
    }
}
