package com.x.todox.dto;

import java.util.List;
import javax.validation.constraints.NotNull;

public class SubtaskUpdateRequest {

    @NotNull
    private Long updaterId;

    private String text;
    private Boolean completed;
    private Integer weight;
    private Boolean requiresInput;
    private String inputValue;
    private Integer order;
    private String completedAt;
    private List<String> images;

    public Long getUpdaterId() {
        return updaterId;
    }

    public String getText() {
        return text;
    }

    public Boolean getCompleted() {
        return completed;
    }

    public Integer getWeight() {
        return weight;
    }

    public Boolean getRequiresInput() {
        return requiresInput;
    }

    public String getInputValue() {
        return inputValue;
    }

    public Integer getOrder() {
        return order;
    }

    public String getCompletedAt() {
        return completedAt;
    }

    public List<String> getImages() {
        return images;
    }

    public void setUpdaterId(Long updaterId) {
        this.updaterId = updaterId;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void setCompleted(Boolean completed) {
        this.completed = completed;
    }

    public void setWeight(Integer weight) {
        this.weight = weight;
    }

    public void setRequiresInput(Boolean requiresInput) {
        this.requiresInput = requiresInput;
    }

    public void setInputValue(String inputValue) {
        this.inputValue = inputValue;
    }

    public void setOrder(Integer order) {
        this.order = order;
    }

    public void setCompletedAt(String completedAt) {
        this.completedAt = completedAt;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }
}
