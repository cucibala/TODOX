package com.x.todox.dto;

import com.x.todox.enums.TaskPriority;
import com.x.todox.enums.TaskStatus;
import java.util.List;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class TaskCreateRequest {

    @NotNull
    private Long orgId;

    @NotNull
    private Long creatorId;

    private Long assigneeId;
    private String projectId;

    @NotBlank
    private String text;

    private Boolean completed;
    private Boolean pinned;
    private TaskStatus status;
    private TaskPriority priority;
    private String dueDate;
    private String startedAt;
    private String completedAt;
    private Integer order;
    private List<String> images;
    private List<SubtaskCreateRequest> subtasks;

    public Long getOrgId() {
        return orgId;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public Long getAssigneeId() {
        return assigneeId;
    }

    public String getProjectId() {
        return projectId;
    }

    public String getText() {
        return text;
    }

    public Boolean getCompleted() {
        return completed;
    }

    public Boolean getPinned() {
        return pinned;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public TaskPriority getPriority() {
        return priority;
    }

    public String getDueDate() {
        return dueDate;
    }

    public String getStartedAt() {
        return startedAt;
    }

    public String getCompletedAt() {
        return completedAt;
    }

    public Integer getOrder() {
        return order;
    }

    public List<String> getImages() {
        return images;
    }

    public List<SubtaskCreateRequest> getSubtasks() {
        return subtasks;
    }

    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }

    public void setCreatorId(Long creatorId) {
        this.creatorId = creatorId;
    }

    public void setAssigneeId(Long assigneeId) {
        this.assigneeId = assigneeId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void setCompleted(Boolean completed) {
        this.completed = completed;
    }

    public void setPinned(Boolean pinned) {
        this.pinned = pinned;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }

    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public void setStartedAt(String startedAt) {
        this.startedAt = startedAt;
    }

    public void setCompletedAt(String completedAt) {
        this.completedAt = completedAt;
    }

    public void setOrder(Integer order) {
        this.order = order;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public void setSubtasks(List<SubtaskCreateRequest> subtasks) {
        this.subtasks = subtasks;
    }
}
