package com.x.todox.service;

import com.x.todox.dto.ProjectCreateRequest;
import com.x.todox.dto.ProjectGroupCreateRequest;
import com.x.todox.dto.ProjectGroupResponse;
import com.x.todox.dto.ProjectGroupUpdateRequest;
import com.x.todox.dto.ProjectOverviewResponse;
import com.x.todox.dto.ProjectResponse;
import com.x.todox.dto.ProjectUpdateRequest;
import com.x.todox.entity.OrgMember;
import com.x.todox.entity.Organization;
import com.x.todox.entity.Project;
import com.x.todox.entity.ProjectGroup;
import com.x.todox.enums.MemberRole;
import com.x.todox.repository.OrgMemberRepository;
import com.x.todox.repository.OrganizationRepository;
import com.x.todox.repository.ProjectGroupRepository;
import com.x.todox.repository.ProjectRepository;
import com.x.todox.repository.TaskRepository;
import com.x.todox.util.IdGenerator;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {

    private final OrganizationRepository organizationRepository;
    private final OrgMemberRepository orgMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectGroupRepository projectGroupRepository;
    private final TaskRepository taskRepository;
    private final TaskService taskService;

    public ProjectService(OrganizationRepository organizationRepository,
                          OrgMemberRepository orgMemberRepository,
                          ProjectRepository projectRepository,
                          ProjectGroupRepository projectGroupRepository,
                          TaskRepository taskRepository,
                          TaskService taskService) {
        this.organizationRepository = organizationRepository;
        this.orgMemberRepository = orgMemberRepository;
        this.projectRepository = projectRepository;
        this.projectGroupRepository = projectGroupRepository;
        this.taskRepository = taskRepository;
        this.taskService = taskService;
    }

    @Transactional(readOnly = true)
    public ProjectOverviewResponse getOverview(Long orgId, String requesterId) {
        requireMember(orgId, requesterId);
        List<ProjectGroupResponse> groups = projectGroupRepository.findByOrganizationId(orgId).stream()
            .map(this::toGroupResponse)
            .collect(Collectors.toList());
        List<ProjectResponse> projects = projectRepository.findByOrganizationId(orgId).stream()
            .map(this::toProjectResponse)
            .collect(Collectors.toList());
        return new ProjectOverviewResponse(projects, groups);
    }

    @Transactional
    public ProjectGroupResponse createProjectGroup(ProjectGroupCreateRequest request) {
        Organization organization = organizationRepository.findById(request.getOrgId())
            .orElseThrow(() -> new IllegalArgumentException("组织不存在"));
        OrgMember creator = requireMember(organization.getId(), request.getCreatorId());
        ensureAdmin(creator);

        ProjectGroup group = new ProjectGroup();
        group.setId(IdGenerator.newId());
        group.setOrganization(organization);
        group.setName(request.getName());
        group.setOrderIndex(request.getOrder() != null ? request.getOrder() : 0);

        return toGroupResponse(projectGroupRepository.save(group));
    }

    @Transactional
    public ProjectGroupResponse updateProjectGroup(String groupId, ProjectGroupUpdateRequest request) {
        ProjectGroup group = projectGroupRepository.findById(groupId)
            .orElseThrow(() -> new IllegalArgumentException("分组不存在"));
        OrgMember updater = requireMember(group.getOrganization().getId(), request.getUpdaterId());
        ensureAdmin(updater);

        if (request.getName() != null) {
            group.setName(request.getName());
        }
        if (request.getOrder() != null) {
            group.setOrderIndex(request.getOrder());
        }

        return toGroupResponse(projectGroupRepository.save(group));
    }

    @Transactional
    public void deleteProjectGroup(String groupId, String updaterId) {
        ProjectGroup group = projectGroupRepository.findById(groupId)
            .orElseThrow(() -> new IllegalArgumentException("分组不存在"));
        OrgMember updater = requireMember(group.getOrganization().getId(), updaterId);
        ensureAdmin(updater);

        List<Project> projects = projectRepository.findByOrganizationIdAndGroupId(group.getOrganization().getId(), groupId);
        for (Project project : projects) {
            project.setGroup(null);
            projectRepository.save(project);
        }
        projectGroupRepository.delete(group);
    }

    @Transactional
    public ProjectResponse createProject(ProjectCreateRequest request) {
        Organization organization = organizationRepository.findById(request.getOrgId())
            .orElseThrow(() -> new IllegalArgumentException("组织不存在"));
        OrgMember creator = requireMember(organization.getId(), request.getCreatorId());
        ensureAdmin(creator);

        Project project = new Project();
        project.setId(IdGenerator.newId());
        project.setOrganization(organization);
        project.setName(request.getName());
        project.setColor(request.getColor());
        project.setIcon(request.getIcon());
        project.setPriority(request.getPriority() != null ? request.getPriority() : "medium");
        project.setOrderIndex(request.getOrder() != null ? request.getOrder() : 0);

        if (request.getGroupId() != null) {
            ProjectGroup group = projectGroupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new IllegalArgumentException("项目分组不存在"));
            project.setGroup(group);
        }

        return toProjectResponse(projectRepository.save(project));
    }

    @Transactional
    public ProjectResponse updateProject(String projectId, ProjectUpdateRequest request) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new IllegalArgumentException("项目不存在"));
        OrgMember updater = requireMember(project.getOrganization().getId(), request.getUpdaterId());
        ensureAdmin(updater);

        if (request.getName() != null) {
            project.setName(request.getName());
        }
        if (request.getColor() != null) {
            project.setColor(request.getColor());
        }
        if (request.getIcon() != null) {
            project.setIcon(request.getIcon());
        }
        if (request.getPriority() != null) {
            project.setPriority(request.getPriority());
        }
        if (request.getOrder() != null) {
            project.setOrderIndex(request.getOrder());
        }
        if (request.getGroupId() != null) {
            if (request.getGroupId().isEmpty()) {
                project.setGroup(null);
            } else {
                ProjectGroup group = projectGroupRepository.findById(request.getGroupId())
                    .orElseThrow(() -> new IllegalArgumentException("项目分组不存在"));
                project.setGroup(group);
            }
        }

        return toProjectResponse(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(String projectId, String updaterId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new IllegalArgumentException("项目不存在"));
        OrgMember updater = requireMember(project.getOrganization().getId(), updaterId);
        ensureAdmin(updater);
        taskRepository.findByOrganizationIdAndProjectId(project.getOrganization().getId(), projectId)
            .forEach(task -> taskService.deleteTask(task.getId(), updaterId));
        projectRepository.delete(project);
    }

    private OrgMember requireMember(Long orgId, String memberId) {
        return orgMemberRepository.findByIdAndOrganizationId(memberId, orgId)
            .orElseThrow(() -> new IllegalArgumentException("成员不存在"));
    }

    private void ensureAdmin(OrgMember member) {
        if (member.getRole() != MemberRole.ADMIN) {
            throw new IllegalArgumentException("只有组织管理员可以执行此操作");
        }
    }

    private ProjectGroupResponse toGroupResponse(ProjectGroup group) {
        ProjectGroupResponse response = new ProjectGroupResponse();
        response.setId(group.getId());
        response.setOrgId(group.getOrganization().getId());
        response.setName(group.getName());
        response.setOrder(group.getOrderIndex());
        response.setCreatedAt(group.getCreatedAt());
        response.setUpdatedAt(group.getUpdatedAt());
        return response;
    }

    private ProjectResponse toProjectResponse(Project project) {
        ProjectResponse response = new ProjectResponse();
        response.setId(project.getId());
        response.setOrgId(project.getOrganization().getId());
        response.setName(project.getName());
        response.setColor(project.getColor());
        response.setIcon(project.getIcon());
        response.setGroupId(project.getGroup() != null ? project.getGroup().getId() : null);
        response.setPriority(project.getPriority());
        response.setOrder(project.getOrderIndex());
        response.setCreatedAt(project.getCreatedAt());
        response.setUpdatedAt(project.getUpdatedAt());
        return response;
    }
}
