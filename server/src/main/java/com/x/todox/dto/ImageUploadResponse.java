package com.x.todox.dto;

public class ImageUploadResponse {

    private String fileName;
    private boolean video;

    public ImageUploadResponse(String fileName, boolean video) {
        this.fileName = fileName;
        this.video = video;
    }

    public String getFileName() {
        return fileName;
    }

    public boolean isVideo() {
        return video;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setVideo(boolean video) {
        this.video = video;
    }
}
