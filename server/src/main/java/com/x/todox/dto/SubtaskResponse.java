package com.x.todox.dto;

import java.util.List;

public class SubtaskResponse {

    private String id;
    private String text;
    private boolean completed;
    private Integer weight;
    private boolean requiresInput;
    private String inputValue;
    private Integer order;
    private String createdAt;
    private String updatedAt;
    private String completedAt;
    private List<String> images;

    public String getId() {
        return id;
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

    public Integer getOrder() {
        return order;
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

    public List<String> getImages() {
        return images;
    }

    public void setId(String id) {
        this.id = id;
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

    public void setOrder(Integer order) {
        this.order = order;
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

    public void setImages(List<String> images) {
        this.images = images;
    }
}
