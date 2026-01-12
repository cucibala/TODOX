package com.x.todox.repository;

import com.x.todox.entity.Project;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByOrganizationId(Long orgId);
    List<Project> findByOrganizationIdAndGroupId(Long orgId, String groupId);
}
