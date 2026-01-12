package com.x.todox.dto;

import java.util.List;
import javax.validation.constraints.NotNull;

public class SubtaskReplaceRequest {

    @NotNull
    private Long updaterId;

    @NotNull
    private List<SubtaskCreateRequest> subtasks;

    public Long getUpdaterId() {
        return updaterId;
    }

    public List<SubtaskCreateRequest> getSubtasks() {
        return subtasks;
    }

    public void setUpdaterId(Long updaterId) {
        this.updaterId = updaterId;
    }

    public void setSubtasks(List<SubtaskCreateRequest> subtasks) {
        this.subtasks = subtasks;
    }
}
