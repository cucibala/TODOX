package com.x.todox.repository;

import com.x.todox.entity.ImageAttachment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageAttachmentRepository extends JpaRepository<ImageAttachment, String> {
    List<ImageAttachment> findByOrganizationIdAndEntityTypeAndEntityId(Long orgId, String entityType, String entityId);
    void deleteByOrganizationIdAndEntityTypeAndEntityId(Long orgId, String entityType, String entityId);
    Optional<ImageAttachment> findByOrganizationIdAndFileName(Long orgId, String fileName);
    void deleteByOrganizationIdAndFileName(Long orgId, String fileName);
}
