package com.x.todox.controller;

import com.x.todox.dto.JoinOrgRequest;
import com.x.todox.dto.JoinOrgResponse;
import com.x.todox.dto.OrgMemberResponse;
import com.x.todox.service.OrganizationService;
import java.util.List;
import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orgs")
@Validated
public class OrganizationController {

    private final OrganizationService organizationService;

    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @PostMapping("/join")
    public JoinOrgResponse joinOrganization(@Valid @RequestBody JoinOrgRequest request) {
        return organizationService.joinOrganization(request);
    }

    @GetMapping("/{orgId}/members")
    public List<OrgMemberResponse> listMembers(@PathVariable("orgId") Long orgId,
                                               @RequestParam("requesterId") @NotNull Long requesterId) {
        return organizationService.listMembers(orgId, requesterId);
    }
}
