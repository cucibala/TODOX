package com.x.todox.repository;

import com.x.todox.entity.Task;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByOrganizationId(Long orgId);
    List<Task> findByOrganizationIdAndAssigneeId(Long orgId, Long assigneeId);
    List<Task> findByOrganizationIdAndProjectId(Long orgId, String projectId);
}
