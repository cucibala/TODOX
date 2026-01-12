package com.x.todox.repository;

import com.x.todox.entity.Subtask;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubtaskRepository extends JpaRepository<Subtask, String> {
    List<Subtask> findByTaskId(String taskId);
    void deleteByTaskId(String taskId);
}
