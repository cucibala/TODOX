package com.x.todox.dto;

import java.util.List;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.NotBlank;

public class SubtaskReplaceRequest {

    @NotBlank
    private String updaterId;

    @NotNull
    private List<SubtaskCreateRequest> subtasks;

    public String getUpdaterId() {
        return updaterId;
    }

    public List<SubtaskCreateRequest> getSubtasks() {
        return subtasks;
    }

    public void setUpdaterId(String updaterId) {
        this.updaterId = updaterId;
    }

    public void setSubtasks(List<SubtaskCreateRequest> subtasks) {
        this.subtasks = subtasks;
    }
}
