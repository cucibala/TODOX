package com.x.todox.repository;

import com.x.todox.entity.ProgressRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgressRecordRepository extends JpaRepository<ProgressRecord, String> {
    List<ProgressRecord> findByTaskId(String taskId);
    void deleteByTaskId(String taskId);
}
