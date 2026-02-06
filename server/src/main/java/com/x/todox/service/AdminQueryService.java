package com.x.todox.service;

import com.x.todox.dto.AdminMemberSummaryResponse;
import com.x.todox.dto.AdminOrgSummaryResponse;
import com.x.todox.dto.AdminProjectSummaryResponse;
import com.x.todox.entity.OrgMember;
import com.x.todox.entity.Organization;
import com.x.todox.entity.Project;
import com.x.todox.repository.OrgMemberRepository;
import com.x.todox.repository.OrganizationRepository;
import com.x.todox.repository.ProjectRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminQueryService {

    private final OrganizationRepository organizationRepository;
    private final ProjectRepository projectRepository;
    private final OrgMemberRepository orgMemberRepository;

    public AdminQueryService(OrganizationRepository organizationRepository,
                             ProjectRepository projectRepository,
                             OrgMemberRepository orgMemberRepository) {
        this.organizationRepository = organizationRepository;
        this.projectRepository = projectRepository;
        this.orgMemberRepository = orgMemberRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminOrgSummaryResponse> listOrganizations() {
        return organizationRepository.findAll().stream()
            .map(this::toOrgSummary)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AdminProjectSummaryResponse> listProjects(Long orgId) {
        ensureOrgExists(orgId);
        return projectRepository.findByOrganizationId(orgId).stream()
            .map(this::toProjectSummary)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AdminMemberSummaryResponse> listMembers(Long orgId) {
        ensureOrgExists(orgId);
        return orgMemberRepository.findByOrganizationId(orgId).stream()
            .map(this::toMemberSummary)
            .collect(Collectors.toList());
    }

    private AdminOrgSummaryResponse toOrgSummary(Organization organization) {
        return new AdminOrgSummaryResponse(
            organization.getId(),
            organization.getName(),
            organization.getAccount(),
            organization.getCreatedAt()
        );
    }

    private AdminProjectSummaryResponse toProjectSummary(Project project) {
        return new AdminProjectSummaryResponse(
            project.getId(),
            project.getOrganization().getId(),
            project.getName(),
            project.getGroup() != null ? project.getGroup().getId() : null,
            project.getPriority(),
            project.getCreatedAt(),
            project.getUpdatedAt()
        );
    }

    private AdminMemberSummaryResponse toMemberSummary(OrgMember member) {
        return new AdminMemberSummaryResponse(
            member.getId(),
            member.getOrganization().getId(),
            member.getName(),
            member.getRole().name(),
            member.getCreatedAt(),
            member.getUpdatedAt()
        );
    }

    private void ensureOrgExists(Long orgId) {
        if (!organizationRepository.existsById(orgId)) {
            throw new IllegalArgumentException("组织不存在");
        }
    }
}
