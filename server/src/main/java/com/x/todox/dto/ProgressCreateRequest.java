package com.x.todox.dto;

import java.util.List;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class ProgressCreateRequest {

    @NotNull
    private Long updaterId;

    @NotBlank
    private String text;

    private List<String> images;

    public Long getUpdaterId() {
        return updaterId;
    }

    public String getText() {
        return text;
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

    public void setImages(List<String> images) {
        this.images = images;
    }
}
