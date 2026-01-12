package com.x.todox.repository;

import com.x.todox.entity.ProjectGroup;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectGroupRepository extends JpaRepository<ProjectGroup, String> {
    List<ProjectGroup> findByOrganizationId(Long orgId);
}
