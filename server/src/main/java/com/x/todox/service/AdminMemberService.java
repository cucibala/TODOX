package com.x.todox.service;

import com.x.todox.dto.AdminMemberSummaryResponse;
import com.x.todox.entity.OrgMember;
import com.x.todox.enums.MemberRole;
import com.x.todox.repository.OrgMemberRepository;
import com.x.todox.repository.OrganizationRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminMemberService {

    private final OrganizationRepository organizationRepository;
    private final OrgMemberRepository orgMemberRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AdminMemberService(OrganizationRepository organizationRepository,
                              OrgMemberRepository orgMemberRepository) {
        this.organizationRepository = organizationRepository;
        this.orgMemberRepository = orgMemberRepository;
    }

    @Transactional
    public AdminMemberSummaryResponse createMember(Long orgId, String id, String name, String role, String password) {
        ensureOrgExists(orgId);
        if (orgMemberRepository.findById(id).isPresent()) {
            throw new IllegalArgumentException("成员账号已存在");
        }
        OrgMember member = new OrgMember();
        member.setId(id);
        member.setOrganization(organizationRepository.findById(orgId)
            .orElseThrow(() -> new IllegalArgumentException("组织不存在")));
        member.setName(name);
        member.setRole(parseRole(role, MemberRole.USER));
        member.setPasswordHash(passwordEncoder.encode(password));
        OrgMember saved = orgMemberRepository.save(member);
        return toSummary(saved);
    }

    @Transactional
    public AdminMemberSummaryResponse updateRole(Long orgId, String memberId, String role) {
        ensureOrgExists(orgId);
        OrgMember member = orgMemberRepository.findByIdAndOrganizationId(memberId, orgId)
            .orElseThrow(() -> new IllegalArgumentException("成员不存在"));
        MemberRole nextRole = parseRole(role, null);

        if (member.getRole() == MemberRole.ADMIN && nextRole != MemberRole.ADMIN) {
            long adminCount = orgMemberRepository.countByOrganizationIdAndRole(orgId, MemberRole.ADMIN);
            if (adminCount <= 1) {
                throw new IllegalArgumentException("至少保留一名管理员");
            }
        }

        member.setRole(nextRole);
        OrgMember saved = orgMemberRepository.save(member);
        return toSummary(saved);
    }

    @Transactional
    public void resetPassword(Long orgId, String memberId, String password) {
        ensureOrgExists(orgId);
        OrgMember member = orgMemberRepository.findByIdAndOrganizationId(memberId, orgId)
            .orElseThrow(() -> new IllegalArgumentException("成员不存在"));
        member.setPasswordHash(passwordEncoder.encode(password));
        orgMemberRepository.save(member);
    }

    @Transactional
    public void deleteMember(Long orgId, String memberId) {
        ensureOrgExists(orgId);
        OrgMember member = orgMemberRepository.findByIdAndOrganizationId(memberId, orgId)
            .orElseThrow(() -> new IllegalArgumentException("成员不存在"));

        if (member.getRole() == MemberRole.ADMIN) {
            long adminCount = orgMemberRepository.countByOrganizationIdAndRole(orgId, MemberRole.ADMIN);
            if (adminCount <= 1) {
                throw new IllegalArgumentException("至少保留一名管理员");
            }
        }

        orgMemberRepository.delete(member);
    }

    private MemberRole parseRole(String role, MemberRole fallback) {
        if (role == null || role.trim().isEmpty()) {
            if (fallback != null) {
                return fallback;
            }
            throw new IllegalArgumentException("角色不能为空");
        }
        try {
            return MemberRole.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("角色无效");
        }
    }

    private void ensureOrgExists(Long orgId) {
        if (!organizationRepository.existsById(orgId)) {
            throw new IllegalArgumentException("组织不存在");
        }
    }

    private AdminMemberSummaryResponse toSummary(OrgMember member) {
        return new AdminMemberSummaryResponse(
            member.getId(),
            member.getOrganization().getId(),
            member.getName(),
            member.getRole().name(),
            member.getCreatedAt(),
            member.getUpdatedAt()
        );
    }
}
