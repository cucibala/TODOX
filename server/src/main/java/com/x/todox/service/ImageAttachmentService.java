package com.x.todox.service;

import com.x.todox.entity.ImageAttachment;
import com.x.todox.entity.Organization;
import com.x.todox.repository.ImageAttachmentRepository;
import com.x.todox.repository.OrganizationRepository;
import com.x.todox.util.IdGenerator;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ImageAttachmentService {

    private final ImageAttachmentRepository imageAttachmentRepository;
    private final OrganizationRepository organizationRepository;

    public ImageAttachmentService(ImageAttachmentRepository imageAttachmentRepository,
                                  OrganizationRepository organizationRepository) {
        this.imageAttachmentRepository = imageAttachmentRepository;
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public List<String> getImages(Long orgId, String entityType, String entityId) {
        if (orgId == null || entityId == null || entityType == null) {
            return Collections.emptyList();
        }
        return imageAttachmentRepository.findByOrganizationIdAndEntityTypeAndEntityId(orgId, entityType, entityId)
            .stream()
            .map(ImageAttachment::getFileName)
            .collect(Collectors.toList());
    }

    @Transactional
    public void saveImages(Long orgId, String entityType, String entityId, List<String> fileNames) {
        if (orgId == null || entityId == null || entityType == null) {
            return;
        }
        imageAttachmentRepository.deleteByOrganizationIdAndEntityTypeAndEntityId(orgId, entityType, entityId);
        if (fileNames == null || fileNames.isEmpty()) {
            return;
        }
        Organization organization = organizationRepository.findById(orgId)
            .orElseThrow(() -> new IllegalArgumentException("组织不存在"));

        for (String fileName : fileNames) {
            ImageAttachment attachment = new ImageAttachment();
            attachment.setId(IdGenerator.newId());
            attachment.setOrganization(organization);
            attachment.setEntityType(entityType);
            attachment.setEntityId(entityId);
            attachment.setFileName(fileName);
            imageAttachmentRepository.save(attachment);
        }
    }

    @Transactional
    public void deleteImages(Long orgId, String entityType, String entityId) {
        if (orgId == null || entityId == null || entityType == null) {
            return;
        }
        imageAttachmentRepository.deleteByOrganizationIdAndEntityTypeAndEntityId(orgId, entityType, entityId);
    }

    @Transactional
    public void deleteImageRecordsByFileName(Long orgId, String fileName) {
        if (orgId == null || fileName == null) {
            return;
        }
        imageAttachmentRepository.deleteByOrganizationIdAndFileName(orgId, fileName);
    }
}
