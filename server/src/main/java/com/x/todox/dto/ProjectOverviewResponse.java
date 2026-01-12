package com.x.todox.dto;

import java.util.List;

public class ProjectOverviewResponse {

    private List<ProjectResponse> projects;
    private List<ProjectGroupResponse> projectGroups;

    public ProjectOverviewResponse(List<ProjectResponse> projects, List<ProjectGroupResponse> projectGroups) {
        this.projects = projects;
        this.projectGroups = projectGroups;
    }

    public List<ProjectResponse> getProjects() {
        return projects;
    }

    public List<ProjectGroupResponse> getProjectGroups() {
        return projectGroups;
    }

    public void setProjects(List<ProjectResponse> projects) {
        this.projects = projects;
    }

    public void setProjectGroups(List<ProjectGroupResponse> projectGroups) {
        this.projectGroups = projectGroups;
    }
}
