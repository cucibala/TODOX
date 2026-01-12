package com.x.todox.controller;

import com.x.todox.dto.ImageUploadRequest;
import com.x.todox.dto.ImageUploadResponse;
import com.x.todox.repository.OrgMemberRepository;
import com.x.todox.service.ImageAttachmentService;
import com.x.todox.service.ImageStorageService;
import java.io.File;
import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/images")
@Validated
public class ImageController {

    private final OrgMemberRepository orgMemberRepository;
    private final ImageStorageService imageStorageService;
    private final ImageAttachmentService imageAttachmentService;

    public ImageController(OrgMemberRepository orgMemberRepository,
                           ImageStorageService imageStorageService,
                           ImageAttachmentService imageAttachmentService) {
        this.orgMemberRepository = orgMemberRepository;
        this.imageStorageService = imageStorageService;
        this.imageAttachmentService = imageAttachmentService;
    }

    @PostMapping
    public ImageUploadResponse uploadImage(@Valid @RequestBody ImageUploadRequest request) {
        requireMember(request.getOrgId(), request.getMemberId());
        return imageStorageService.saveDataUrl(request.getOrgId(), request.getDataUrl());
    }

    @GetMapping("/{fileName}")
    public ResponseEntity<Resource> getImage(@PathVariable("fileName") String fileName,
                                             @RequestParam("orgId") @NotNull Long orgId,
                                             @RequestParam("memberId") @NotNull Long memberId) {
        requireMember(orgId, memberId);
        File file = imageStorageService.getImageFile(orgId, fileName);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }
        MediaType mediaType = MediaTypeFactory.getMediaType(file.getName())
            .orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
            .contentType(mediaType)
            .body(new FileSystemResource(file));
    }

    @DeleteMapping("/{fileName}")
    public void deleteImage(@PathVariable("fileName") String fileName,
                            @RequestParam("orgId") @NotNull Long orgId,
                            @RequestParam("memberId") @NotNull Long memberId) {
        requireMember(orgId, memberId);
        imageStorageService.deleteImageFile(orgId, fileName);
        imageAttachmentService.deleteImageRecordsByFileName(orgId, fileName);
    }

    private void requireMember(Long orgId, Long memberId) {
        orgMemberRepository.findByIdAndOrganizationId(memberId, orgId)
            .orElseThrow(() -> new IllegalArgumentException("成员不存在"));
    }
}
