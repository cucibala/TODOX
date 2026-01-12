package com.x.todox.controller;

import com.x.todox.dto.ProgressCreateRequest;
import com.x.todox.dto.ProgressResponse;
import com.x.todox.dto.ProgressUpdateRequest;
import com.x.todox.dto.SubtaskCreateRequest;
import com.x.todox.dto.SubtaskReplaceRequest;
import com.x.todox.dto.SubtaskResponse;
import com.x.todox.dto.SubtaskUpdateRequest;
import com.x.todox.dto.TaskCreateRequest;
import com.x.todox.dto.TaskResponse;
import com.x.todox.dto.TaskUpdateRequest;
import com.x.todox.service.TaskService;
import java.util.List;
import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
@Validated
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public TaskResponse createTask(@Valid @RequestBody TaskCreateRequest request) {
        return taskService.createTask(request);
    }

    @PutMapping("/{id}")
    public TaskResponse updateTask(@PathVariable("id") String id,
                                   @Valid @RequestBody TaskUpdateRequest request) {
        return taskService.updateTask(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable("id") String id,
                           @RequestParam("updaterId") @NotNull Long updaterId) {
        taskService.deleteTask(id, updaterId);
    }

    @GetMapping
    public List<TaskResponse> listTasks(@RequestParam("orgId") @NotNull Long orgId,
                                        @RequestParam("requesterId") @NotNull Long requesterId,
                                        @RequestParam(value = "assigneeId", required = false) Long assigneeId) {
        return taskService.listTasks(orgId, requesterId, assigneeId);
    }

    @PostMapping("/{id}/subtasks")
    public SubtaskResponse addSubtask(@PathVariable("id") String taskId,
                                      @Valid @RequestBody SubtaskCreateRequest request,
                                      @RequestParam("updaterId") @NotNull Long updaterId) {
        return taskService.addSubtask(taskId, request, updaterId);
    }

    @PostMapping("/{id}/subtasks/replace")
    public List<SubtaskResponse> replaceSubtasks(@PathVariable("id") String taskId,
                                                 @Valid @RequestBody SubtaskReplaceRequest request) {
        return taskService.replaceSubtasks(taskId, request);
    }

    @PutMapping("/subtasks/{id}")
    public SubtaskResponse updateSubtask(@PathVariable("id") String subtaskId,
                                         @Valid @RequestBody SubtaskUpdateRequest request) {
        return taskService.updateSubtask(subtaskId, request);
    }

    @DeleteMapping("/subtasks/{id}")
    public void deleteSubtask(@PathVariable("id") String subtaskId,
                              @RequestParam("updaterId") @NotNull Long updaterId) {
        taskService.deleteSubtask(subtaskId, updaterId);
    }

    @PostMapping("/{id}/progress")
    public ProgressResponse addProgress(@PathVariable("id") String taskId,
                                        @Valid @RequestBody ProgressCreateRequest request) {
        return taskService.addProgress(taskId, request);
    }

    @PutMapping("/progress/{id}")
    public ProgressResponse updateProgress(@PathVariable("id") String progressId,
                                           @Valid @RequestBody ProgressUpdateRequest request) {
        return taskService.updateProgress(progressId, request);
    }

    @DeleteMapping("/progress/{id}")
    public void deleteProgress(@PathVariable("id") String progressId,
                               @RequestParam("updaterId") @NotNull Long updaterId) {
        taskService.deleteProgress(progressId, updaterId);
    }
}
