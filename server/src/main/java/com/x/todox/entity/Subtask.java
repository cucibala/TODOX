package com.x.todox.entity;

import com.x.todox.util.TimeUtil;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import javax.persistence.Table;

@Entity
@Table(name = "subtasks")
public class Subtask {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "todo_id", nullable = false)
    private Task task;

    @Column(nullable = false)
    private String text;

    @Column(nullable = false)
    private boolean completed;

    @Column(nullable = false)
    private Integer weight;

    @Column(name = "requires_input", nullable = false)
    private boolean requiresInput;

    @Column(name = "input_value")
    private String inputValue;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @Column(name = "created_at", nullable = false)
    private String createdAt;

    @Column(name = "updated_at", nullable = false)
    private String updatedAt;

    @Column(name = "completed_at")
    private String completedAt;

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

    public Task getTask() {
        return task;
    }

    public String getText() {
        return text;
    }

    public boolean isCompleted() {
        return completed;
    }

    public Integer getWeight() {
        return weight;
    }

    public boolean isRequiresInput() {
        return requiresInput;
    }

    public String getInputValue() {
        return inputValue;
    }

    public Integer getOrderIndex() {
        return orderIndex;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public String getCompletedAt() {
        return completedAt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setTask(Task task) {
        this.task = task;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }

    public void setRequiresInput(boolean requiresInput) {
        this.requiresInput = requiresInput;
    }

    public void setInputValue(String inputValue) {
        this.inputValue = inputValue;
    }

    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setCompletedAt(String completedAt) {
        this.completedAt = completedAt;
    }
}
