package com.x.todox.service;

import com.x.todox.dto.ProgressCreateRequest;
import com.x.todox.dto.ProgressResponse;
import com.x.todox.dto.ProgressUpdateRequest;
import com.x.todox.dto.SubtaskCreateRequest;
import com.x.todox.dto.SubtaskReplaceRequest;
import com.x.todox.dto.SubtaskResponse;
import com.x.todox.dto.SubtaskUpdateRequest;
import com.x.todox.dto.TaskCreateRequest;
import com.x.todox.dto.TaskResponse;
import com.x.todox.dto.TaskUpdateRequest;
import com.x.todox.entity.OrgMember;
import com.x.todox.entity.Organization;
import com.x.todox.entity.ProgressRecord;
import com.x.todox.entity.Subtask;
import com.x.todox.entity.Task;
import com.x.todox.enums.MemberRole;
import com.x.todox.enums.TaskPriority;
import com.x.todox.enums.TaskStatus;
import com.x.todox.repository.OrgMemberRepository;
import com.x.todox.repository.OrganizationRepository;
import com.x.todox.repository.ProgressRecordRepository;
import com.x.todox.repository.SubtaskRepository;
import com.x.todox.repository.TaskRepository;
import com.x.todox.util.IdGenerator;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

    private final OrganizationRepository organizationRepository;
    private final OrgMemberRepository orgMemberRepository;
    private final TaskRepository taskRepository;
    private final SubtaskRepository subtaskRepository;
    private final ProgressRecordRepository progressRecordRepository;
    private final ImageAttachmentService imageAttachmentService;

    public TaskService(OrganizationRepository organizationRepository,
                       OrgMemberRepository orgMemberRepository,
                       TaskRepository taskRepository,
                       SubtaskRepository subtaskRepository,
                       ProgressRecordRepository progressRecordRepository,
                       ImageAttachmentService imageAttachmentService) {
        this.organizationRepository = organizationRepository;
        this.orgMemberRepository = orgMemberRepository;
        this.taskRepository = taskRepository;
        this.subtaskRepository = subtaskRepository;
        this.progressRecordRepository = progressRecordRepository;
        this.imageAttachmentService = imageAttachmentService;
    }

    @Transactional
    public TaskResponse createTask(TaskCreateRequest request) {
        Organization organization = organizationRepository.findById(request.getOrgId())
            .orElseThrow(() -> new IllegalArgumentException("组织不存在"));

        OrgMember creator = requireMember(organization.getId(), request.getCreatorId());
        ensureAdmin(creator);

        OrgMember assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = requireMember(organization.getId(), request.getAssigneeId());
        }

        Task task = new Task();
        task.setId(IdGenerator.newId());
        task.setOrganization(organization);
        task.setCreator(creator);
        task.setAssignee(assignee);
        task.setProjectId(request.getProjectId());
        task.setText(request.getText());
        task.setCompleted(Boolean.TRUE.equals(request.getCompleted()));
        task.setPinned(Boolean.TRUE.equals(request.getPinned()));
        task.setStatus(request.getStatus() != null ? request.getStatus() : TaskStatus.TODO);
        task.setPriority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM);
        task.setDueDate(request.getDueDate());
        task.setStartedAt(request.getStartedAt());
        task.setCompletedAt(request.getCompletedAt());
        task.setOrderIndex(request.getOrder() != null ? request.getOrder() : 0);

        Task saved = taskRepository.save(task);

        if (request.getImages() != null) {
            imageAttachmentService.saveImages(organization.getId(), "todo", saved.getId(), request.getImages());
        }

        if (request.getSubtasks() != null && !request.getSubtasks().isEmpty()) {
            for (SubtaskCreateRequest subtaskRequest : request.getSubtasks()) {
                createSubtask(saved, subtaskRequest, organization.getId());
            }
        }

        return toResponse(saved);
    }

    @Transactional
    public TaskResponse updateTask(String taskId, TaskUpdateRequest request) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        OrgMember updater = requireMember(task.getOrganization().getId(), request.getUpdaterId());
        boolean isAdmin = isAdmin(updater);
        boolean isAssignee = task.getAssignee() != null && Objects.equals(task.getAssignee().getId(), updater.getId());
        if (!isAdmin && !isAssignee) {
            throw new IllegalArgumentException("无权限操作该任务");
        }

        if (!isAdmin) {
            if (request.getAssigneeId() != null || request.getProjectId() != null || request.getText() != null
                || request.getPriority() != null || request.getOrder() != null) {
                throw new IllegalArgumentException("只有管理员可以修改任务核心信息");
            }
        }

        if (request.getAssigneeId() != null) {
            OrgMember assignee = requireMember(task.getOrganization().getId(), request.getAssigneeId());
            task.setAssignee(assignee);
        }
        if (request.getProjectId() != null) {
            task.setProjectId(request.getProjectId());
        }
        if (request.getText() != null) {
            task.setText(request.getText());
        }
        if (request.getCompleted() != null) {
            task.setCompleted(request.getCompleted());
        }
        if (request.getPinned() != null) {
            task.setPinned(request.getPinned());
        }
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate().isEmpty() ? null : request.getDueDate());
        }
        if (request.getStartedAt() != null) {
            task.setStartedAt(request.getStartedAt().isEmpty() ? null : request.getStartedAt());
        }
        if (request.getCompletedAt() != null) {
            task.setCompletedAt(request.getCompletedAt().isEmpty() ? null : request.getCompletedAt());
        }
        if (request.getOrder() != null) {
            task.setOrderIndex(request.getOrder());
        }

        Task saved = taskRepository.save(task);

        if (request.getImages() != null) {
            imageAttachmentService.saveImages(task.getOrganization().getId(), "todo", task.getId(), request.getImages());
        }

        return toResponse(saved);
    }

    @Transactional
    public void deleteTask(String taskId, Long updaterId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        OrgMember updater = requireMember(task.getOrganization().getId(), updaterId);
        ensureAdmin(updater);

        List<Subtask> subtasks = subtaskRepository.findByTaskId(task.getId());
        for (Subtask subtask : subtasks) {
            imageAttachmentService.deleteImages(task.getOrganization().getId(), "subtask", subtask.getId());
        }
        List<ProgressRecord> progressRecords = progressRecordRepository.findByTaskId(task.getId());
        for (ProgressRecord progress : progressRecords) {
            imageAttachmentService.deleteImages(task.getOrganization().getId(), "progress", progress.getId());
        }

        imageAttachmentService.deleteImages(task.getOrganization().getId(), "todo", task.getId());
        subtaskRepository.deleteByTaskId(task.getId());
        progressRecordRepository.deleteByTaskId(task.getId());
        taskRepository.delete(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listTasks(Long orgId, Long requesterId, Long assigneeId) {
        requireMember(orgId, requesterId);
        List<Task> tasks = assigneeId == null
            ? taskRepository.findByOrganizationId(orgId)
            : taskRepository.findByOrganizationIdAndAssigneeId(orgId, assigneeId);

        return tasks.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public SubtaskResponse addSubtask(String taskId, SubtaskCreateRequest request, Long updaterId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        OrgMember updater = requireMember(task.getOrganization().getId(), updaterId);
        ensureAdminOrAssignee(task, updater);

        Subtask subtask = createSubtask(task, request, task.getOrganization().getId());
        return toSubtaskResponse(subtask, task.getOrganization().getId());
    }

    @Transactional
    public SubtaskResponse updateSubtask(String subtaskId, SubtaskUpdateRequest request) {
        Subtask subtask = subtaskRepository.findById(subtaskId)
            .orElseThrow(() -> new IllegalArgumentException("子任务不存在"));
        Task task = subtask.getTask();

        OrgMember updater = requireMember(task.getOrganization().getId(), request.getUpdaterId());
        ensureAdminOrAssignee(task, updater);

        if (request.getText() != null) {
            subtask.setText(request.getText());
        }
        if (request.getCompleted() != null) {
            subtask.setCompleted(request.getCompleted());
        }
        if (request.getWeight() != null) {
            subtask.setWeight(request.getWeight());
        }
        if (request.getRequiresInput() != null) {
            subtask.setRequiresInput(request.getRequiresInput());
        }
        if (request.getInputValue() != null) {
            subtask.setInputValue(request.getInputValue());
        }
        if (request.getOrder() != null) {
            subtask.setOrderIndex(request.getOrder());
        }
        if (request.getCompletedAt() != null) {
            subtask.setCompletedAt(request.getCompletedAt().isEmpty() ? null : request.getCompletedAt());
        }

        Subtask saved = subtaskRepository.save(subtask);
        if (request.getImages() != null) {
            imageAttachmentService.saveImages(task.getOrganization().getId(), "subtask", subtask.getId(), request.getImages());
        }
        return toSubtaskResponse(saved, task.getOrganization().getId());
    }

    @Transactional
    public void deleteSubtask(String subtaskId, Long updaterId) {
        Subtask subtask = subtaskRepository.findById(subtaskId)
            .orElseThrow(() -> new IllegalArgumentException("子任务不存在"));
        Task task = subtask.getTask();

        OrgMember updater = requireMember(task.getOrganization().getId(), updaterId);
        ensureAdminOrAssignee(task, updater);

        imageAttachmentService.deleteImages(task.getOrganization().getId(), "subtask", subtask.getId());
        subtaskRepository.delete(subtask);
    }

    @Transactional
    public List<SubtaskResponse> replaceSubtasks(String taskId, SubtaskReplaceRequest request) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        OrgMember updater = requireMember(task.getOrganization().getId(), request.getUpdaterId());
        ensureAdminOrAssignee(task, updater);

        List<Subtask> oldSubtasks = subtaskRepository.findByTaskId(taskId);
        for (Subtask subtask : oldSubtasks) {
            imageAttachmentService.deleteImages(task.getOrganization().getId(), "subtask", subtask.getId());
        }
        subtaskRepository.deleteByTaskId(taskId);

        if (request.getSubtasks() == null || request.getSubtasks().isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return request.getSubtasks().stream()
            .map(subtaskRequest -> createSubtask(task, subtaskRequest, task.getOrganization().getId()))
            .map(subtask -> toSubtaskResponse(subtask, task.getOrganization().getId()))
            .collect(Collectors.toList());
    }

    @Transactional
    public ProgressResponse addProgress(String taskId, ProgressCreateRequest request) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        OrgMember updater = requireMember(task.getOrganization().getId(), request.getUpdaterId());
        ensureAdminOrAssignee(task, updater);

        ProgressRecord record = new ProgressRecord();
        record.setId(IdGenerator.newId());
        record.setTask(task);
        record.setText(request.getText());
        ProgressRecord saved = progressRecordRepository.save(record);

        if (request.getImages() != null) {
            imageAttachmentService.saveImages(task.getOrganization().getId(), "progress", saved.getId(), request.getImages());
        }

        return toProgressResponse(saved, task.getOrganization().getId());
    }

    @Transactional
    public ProgressResponse updateProgress(String progressId, ProgressUpdateRequest request) {
        ProgressRecord record = progressRecordRepository.findById(progressId)
            .orElseThrow(() -> new IllegalArgumentException("进度记录不存在"));
        Task task = record.getTask();

        OrgMember updater = requireMember(task.getOrganization().getId(), request.getUpdaterId());
        ensureAdminOrAssignee(task, updater);

        if (request.getText() != null) {
            record.setText(request.getText());
        }

        ProgressRecord saved = progressRecordRepository.save(record);
        if (request.getImages() != null) {
            imageAttachmentService.saveImages(task.getOrganization().getId(), "progress", record.getId(), request.getImages());
        }

        return toProgressResponse(saved, task.getOrganization().getId());
    }

    @Transactional
    public void deleteProgress(String progressId, Long updaterId) {
        ProgressRecord record = progressRecordRepository.findById(progressId)
            .orElseThrow(() -> new IllegalArgumentException("进度记录不存在"));
        Task task = record.getTask();

        OrgMember updater = requireMember(task.getOrganization().getId(), updaterId);
        ensureAdminOrAssignee(task, updater);

        imageAttachmentService.deleteImages(task.getOrganization().getId(), "progress", record.getId());
        progressRecordRepository.delete(record);
    }

    private Subtask createSubtask(Task task, SubtaskCreateRequest request, Long orgId) {
        Subtask subtask = new Subtask();
        subtask.setId(request.getId() != null ? request.getId() : IdGenerator.newId());
        subtask.setTask(task);
        subtask.setText(request.getText());
        subtask.setCompleted(Boolean.TRUE.equals(request.getCompleted()));
        subtask.setWeight(request.getWeight() != null ? request.getWeight() : 3);
        subtask.setRequiresInput(Boolean.TRUE.equals(request.getRequiresInput()));
        subtask.setInputValue(request.getInputValue());
        subtask.setOrderIndex(request.getOrder() != null ? request.getOrder() : 0);
        subtask.setCompletedAt(request.getCompletedAt());
        if (request.getCreatedAt() != null) {
            subtask.setCreatedAt(request.getCreatedAt());
            subtask.setUpdatedAt(request.getCreatedAt());
        }

        Subtask saved = subtaskRepository.save(subtask);
        if (request.getImages() != null) {
            imageAttachmentService.saveImages(orgId, "subtask", saved.getId(), request.getImages());
        }
        return saved;
    }

    private TaskResponse toResponse(Task task) {
        TaskResponse response = new TaskResponse();
        response.setId(task.getId());
        response.setOrgId(task.getOrganization().getId());
        response.setCreatorId(task.getCreator().getId());
        response.setAssigneeId(task.getAssignee() != null ? task.getAssignee().getId() : null);
        response.setProjectId(task.getProjectId());
        response.setText(task.getText());
        response.setCompleted(task.isCompleted());
        response.setPinned(task.isPinned());
        response.setStatus(task.getStatus());
        response.setPriority(task.getPriority());
        response.setDueDate(task.getDueDate());
        response.setCreatedAt(task.getCreatedAt());
        response.setStartedAt(task.getStartedAt());
        response.setCompletedAt(task.getCompletedAt());
        response.setOrder(task.getOrderIndex());
        response.setUpdatedAt(task.getUpdatedAt());
        response.setImages(imageAttachmentService.getImages(task.getOrganization().getId(), "todo", task.getId()));

        List<SubtaskResponse> subtasks = subtaskRepository.findByTaskId(task.getId()).stream()
            .sorted(Comparator.comparing(Subtask::getOrderIndex, Comparator.nullsLast(Integer::compareTo)))
            .map(subtask -> toSubtaskResponse(subtask, task.getOrganization().getId()))
            .collect(Collectors.toList());
        response.setSubtasks(subtasks);

        List<ProgressResponse> progress = progressRecordRepository.findByTaskId(task.getId()).stream()
            .sorted(Comparator.comparing(ProgressRecord::getCreatedAt))
            .map(record -> toProgressResponse(record, task.getOrganization().getId()))
            .collect(Collectors.toList());
        response.setProgress(progress);

        return response;
    }

    private SubtaskResponse toSubtaskResponse(Subtask subtask, Long orgId) {
        SubtaskResponse response = new SubtaskResponse();
        response.setId(subtask.getId());
        response.setText(subtask.getText());
        response.setCompleted(subtask.isCompleted());
        response.setWeight(subtask.getWeight());
        response.setRequiresInput(subtask.isRequiresInput());
        response.setInputValue(subtask.getInputValue());
        response.setOrder(subtask.getOrderIndex());
        response.setCreatedAt(subtask.getCreatedAt());
        response.setUpdatedAt(subtask.getUpdatedAt());
        response.setCompletedAt(subtask.getCompletedAt());
        response.setImages(imageAttachmentService.getImages(orgId, "subtask", subtask.getId()));
        return response;
    }

    private ProgressResponse toProgressResponse(ProgressRecord record, Long orgId) {
        ProgressResponse response = new ProgressResponse();
        response.setId(record.getId());
        response.setText(record.getText());
        response.setCreatedAt(record.getCreatedAt());
        response.setUpdatedAt(record.getUpdatedAt());
        response.setImages(imageAttachmentService.getImages(orgId, "progress", record.getId()));
        return response;
    }

    private OrgMember requireMember(Long orgId, Long memberId) {
        return orgMemberRepository.findByIdAndOrganizationId(memberId, orgId)
            .orElseThrow(() -> new IllegalArgumentException("成员不存在"));
    }

    private void ensureAdmin(OrgMember member) {
        if (member.getRole() != MemberRole.ADMIN) {
            throw new IllegalArgumentException("只有组织管理员可以执行此操作");
        }
    }

    private boolean isAdmin(OrgMember member) {
        return member.getRole() == MemberRole.ADMIN;
    }

    private void ensureAdminOrAssignee(Task task, OrgMember member) {
        if (isAdmin(member)) {
            return;
        }
        if (task.getAssignee() != null && Objects.equals(task.getAssignee().getId(), member.getId())) {
            return;
        }
        throw new IllegalArgumentException("无权限操作该任务");
    }
}
