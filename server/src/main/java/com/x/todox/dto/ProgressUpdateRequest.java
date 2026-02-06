package com.x.todox.dto;

import java.util.List;
import javax.validation.constraints.NotBlank;

public class ProgressUpdateRequest {

    @NotBlank
    private String updaterId;

    private String text;
    private List<String> images;

    public String getUpdaterId() {
        return updaterId;
    }

    public String getText() {
        return text;
    }

    public List<String> getImages() {
        return images;
    }

    public void setUpdaterId(String updaterId) {
        this.updaterId = updaterId;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }
}
