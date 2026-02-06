package com.x.todox.dto;

import com.x.todox.enums.TaskPriority;
import com.x.todox.enums.TaskStatus;
import java.util.List;

public class TaskResponse {

    private String id;
    private Long orgId;
    private String creatorId;
    private String assigneeId;
    private String projectId;
    private String text;
    private boolean completed;
    private boolean pinned;
    private TaskStatus status;
    private TaskPriority priority;
    private String dueDate;
    private String createdAt;
    private String startedAt;
    private String completedAt;
    private Integer order;
    private String updatedAt;
    private List<String> images;
    private List<SubtaskResponse> subtasks;
    private List<ProgressResponse> progress;

    public String getId() {
        return id;
    }

    public Long getOrgId() {
        return orgId;
    }

    public String getCreatorId() {
        return creatorId;
    }

    public String getAssigneeId() {
        return assigneeId;
    }

    public String getProjectId() {
        return projectId;
    }

    public String getText() {
        return text;
    }

    public boolean isCompleted() {
        return completed;
    }

    public boolean isPinned() {
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

    public String getCreatedAt() {
        return createdAt;
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

    public String getUpdatedAt() {
        return updatedAt;
    }

    public List<String> getImages() {
        return images;
    }

    public List<SubtaskResponse> getSubtasks() {
        return subtasks;
    }

    public List<ProgressResponse> getProgress() {
        return progress;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setOrgId(Long orgId) {
        this.orgId = orgId;
    }

    public void setCreatorId(String creatorId) {
        this.creatorId = creatorId;
    }

    public void setAssigneeId(String assigneeId) {
        this.assigneeId = assigneeId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public void setPinned(boolean pinned) {
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

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
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

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public void setSubtasks(List<SubtaskResponse> subtasks) {
        this.subtasks = subtasks;
    }

    public void setProgress(List<ProgressResponse> progress) {
        this.progress = progress;
    }
}
