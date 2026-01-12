package com.x.todox.dto;

import java.util.List;

public class ProgressResponse {

    private String id;
    private String text;
    private String createdAt;
    private String updatedAt;
    private List<String> images;

    public String getId() {
        return id;
    }

    public String getText() {
        return text;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
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

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }
}
