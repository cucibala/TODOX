package com.x.todox.controller;

import com.x.todox.dto.ProjectCreateRequest;
import com.x.todox.dto.ProjectGroupCreateRequest;
import com.x.todox.dto.ProjectGroupResponse;
import com.x.todox.dto.ProjectGroupUpdateRequest;
import com.x.todox.dto.ProjectOverviewResponse;
import com.x.todox.dto.ProjectResponse;
import com.x.todox.dto.ProjectUpdateRequest;
import com.x.todox.service.ProjectService;
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
@RequestMapping("/api/projects")
@Validated
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/overview")
    public ProjectOverviewResponse getOverview(@RequestParam("orgId") @NotNull Long orgId,
                                               @RequestParam("requesterId") @NotNull Long requesterId) {
        return projectService.getOverview(orgId, requesterId);
    }

    @PostMapping("/groups")
    public ProjectGroupResponse createGroup(@Valid @RequestBody ProjectGroupCreateRequest request) {
        return projectService.createProjectGroup(request);
    }

    @PutMapping("/groups/{id}")
    public ProjectGroupResponse updateGroup(@PathVariable("id") String id,
                                            @Valid @RequestBody ProjectGroupUpdateRequest request) {
        return projectService.updateProjectGroup(id, request);
    }

    @DeleteMapping("/groups/{id}")
    public void deleteGroup(@PathVariable("id") String id,
                            @RequestParam("updaterId") @NotNull Long updaterId) {
        projectService.deleteProjectGroup(id, updaterId);
    }

    @PostMapping
    public ProjectResponse createProject(@Valid @RequestBody ProjectCreateRequest request) {
        return projectService.createProject(request);
    }

    @PutMapping("/{id}")
    public ProjectResponse updateProject(@PathVariable("id") String id,
                                         @Valid @RequestBody ProjectUpdateRequest request) {
        return projectService.updateProject(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteProject(@PathVariable("id") String id,
                              @RequestParam("updaterId") @NotNull Long updaterId) {
        projectService.deleteProject(id, updaterId);
    }
}
