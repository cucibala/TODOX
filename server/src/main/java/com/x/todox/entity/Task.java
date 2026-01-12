package com.x.todox.entity;

import com.x.todox.enums.TaskPriority;
import com.x.todox.enums.TaskStatus;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import javax.persistence.Table;
import com.x.todox.util.TimeUtil;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private OrgMember creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private OrgMember assignee;

    @Column(name = "project_id")
    private String projectId;

    @Column(nullable = false)
    private String text;

    @Column(nullable = false)
    private boolean completed;

    @Column(nullable = false)
    private boolean pinned;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskPriority priority;

    @Column(name = "due_date")
    private String dueDate;

    @Column(name = "created_at", nullable = false)
    private String createdAt;

    @Column(name = "started_at")
    private String startedAt;

    @Column(name = "completed_at")
    private String completedAt;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @Column(name = "updated_at", nullable = false)
    private String updatedAt;

    @PrePersist
    protected void onCreate() {
        String now = TimeUtil.nowIso();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = TimeUtil.nowIso();
    }

    public String getId() {
        return id;
    }

    public Organization getOrganization() {
        return organization;
    }

    public OrgMember getCreator() {
        return creator;
    }

    public OrgMember getAssignee() {
        return assignee;
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

    public Integer getOrderIndex() {
        return orderIndex;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public void setCreator(OrgMember creator) {
        this.creator = creator;
    }

    public void setAssignee(OrgMember assignee) {
        this.assignee = assignee;
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

    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
