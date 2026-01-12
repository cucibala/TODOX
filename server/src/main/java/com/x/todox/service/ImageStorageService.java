package com.x.todox.service;

import com.x.todox.dto.ImageUploadResponse;
import com.x.todox.util.IdGenerator;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ImageStorageService {

    private final String storagePath;

    public ImageStorageService(@Value("${todox.storage-path:storage}") String storagePath) {
        this.storagePath = storagePath;
    }

    public ImageUploadResponse saveDataUrl(Long orgId, String dataUrl) {
        if (orgId == null || dataUrl == null || !dataUrl.startsWith("data:")) {
            throw new IllegalArgumentException("无效的图片数据");
        }

        int commaIndex = dataUrl.indexOf(',');
        if (commaIndex < 0) {
            throw new IllegalArgumentException("无效的图片数据");
        }

        String header = dataUrl.substring(5, commaIndex);
        String base64 = dataUrl.substring(commaIndex + 1);
        String[] headerParts = header.split(";");
        String mimeType = headerParts.length > 0 ? headerParts[0] : "application/octet-stream";

        boolean isVideo = mimeType.startsWith("video/");
        String extension = resolveExtension(mimeType);

        String fileName = IdGenerator.newId() + extension;
        Path dir = Paths.get(storagePath, "images", String.valueOf(orgId));
        Path path = dir.resolve(fileName);
        ensureDirectory(dir);

        byte[] bytes = Base64.getDecoder().decode(base64);
        try {
            Files.write(path, bytes);
        } catch (IOException e) {
            throw new IllegalArgumentException("保存图片失败");
        }

        return new ImageUploadResponse(fileName, isVideo);
    }

    public File getImageFile(Long orgId, String fileName) {
        if (orgId == null || fileName == null) {
            return null;
        }
        Path path = Paths.get(storagePath, "images", String.valueOf(orgId), fileName);
        File file = path.toFile();
        return file.exists() ? file : null;
    }

    public void deleteImageFile(Long orgId, String fileName) {
        if (orgId == null || fileName == null) {
            return;
        }
        Path path = Paths.get(storagePath, "images", String.valueOf(orgId), fileName);
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
    }

    private void ensureDirectory(Path dir) {
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new IllegalArgumentException("创建图片目录失败");
        }
    }

    private String resolveExtension(String mimeType) {
        if (mimeType == null) {
            return ".bin";
        }
        if (mimeType.startsWith("image/")) {
            return "." + mimeType.substring("image/".length());
        }
        if (mimeType.startsWith("video/")) {
            return "." + mimeType.substring("video/".length());
        }
        return ".bin";
    }
}
