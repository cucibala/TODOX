package com.x.todox.dto;

import java.util.List;
import javax.validation.constraints.NotBlank;

public class SubtaskCreateRequest {

    private String id;

    @NotBlank
    private String text;

    private Boolean completed;
    private Integer weight;
    private Boolean requiresInput;
    private String inputValue;
    private Integer order;
    private String completedAt;
    private String createdAt;
    private List<String> images;

    public String getId() {
        return id;
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

    public String getCreatedAt() {
        return createdAt;
    }

    public List<String> getImages() {
        return images;
    }

    public void setId(String id) {
        this.id = id;
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

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }
}
