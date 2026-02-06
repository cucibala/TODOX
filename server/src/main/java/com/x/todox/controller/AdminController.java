package com.x.todox.controller;

import com.x.todox.dto.AdminCreateOrgRequest;
import com.x.todox.dto.AdminCreateOrgResponse;
import com.x.todox.dto.AdminLoginRequest;
import com.x.todox.dto.AdminLoginResponse;
import com.x.todox.dto.AdminMemberCreateRequest;
import com.x.todox.dto.AdminMemberPasswordResetRequest;
import com.x.todox.dto.AdminMemberRoleUpdateRequest;
import com.x.todox.dto.AdminSessionResponse;
import com.x.todox.dto.AdminMemberSummaryResponse;
import com.x.todox.dto.AdminOrgSummaryResponse;
import com.x.todox.dto.AdminProjectSummaryResponse;
import com.x.todox.entity.Organization;
import com.x.todox.service.AdminAuthService;
import com.x.todox.service.AdminMemberService;
import com.x.todox.service.AdminOrganizationService;
import com.x.todox.service.AdminQueryService;
import java.util.List;
import javax.servlet.http.HttpSession;
import javax.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final String SESSION_KEY = "ADMIN_AUTHENTICATED";
    private static final String SESSION_USER = "ADMIN_USERNAME";

    private final AdminAuthService adminAuthService;
    private final AdminOrganizationService adminOrganizationService;
    private final AdminQueryService adminQueryService;
    private final AdminMemberService adminMemberService;

    public AdminController(AdminAuthService adminAuthService,
                           AdminOrganizationService adminOrganizationService,
                           AdminQueryService adminQueryService,
                           AdminMemberService adminMemberService) {
        this.adminAuthService = adminAuthService;
        this.adminOrganizationService = adminOrganizationService;
        this.adminQueryService = adminQueryService;
        this.adminMemberService = adminMemberService;
    }

    @PostMapping("/login")
    public AdminLoginResponse login(@Valid @RequestBody AdminLoginRequest request,
                                    HttpSession session) {
        boolean ok = adminAuthService.authenticate(request.getUsername(), request.getPassword());
        if (!ok) {
            throw new IllegalArgumentException("管理员账号或密码错误");
        }
        session.setAttribute(SESSION_KEY, true);
        session.setAttribute(SESSION_USER, adminAuthService.getUsername());
        return new AdminLoginResponse(adminAuthService.getUsername());
    }

    @PostMapping("/logout")
    public void logout(HttpSession session) {
        session.invalidate();
    }

    @GetMapping("/session")
    public AdminSessionResponse session(HttpSession session) {
        boolean loggedIn = Boolean.TRUE.equals(session.getAttribute(SESSION_KEY));
        String username = loggedIn ? (String) session.getAttribute(SESSION_USER) : null;
        return new AdminSessionResponse(loggedIn, username);
    }

    @PostMapping("/orgs")
    public AdminCreateOrgResponse createOrganization(@Valid @RequestBody AdminCreateOrgRequest request,
                                                     HttpSession session) {
        ensureLoggedIn(session);
        Organization organization = adminOrganizationService.createOrganization(
            request.getName().trim(),
            request.getAccount().trim()
        );
        return new AdminCreateOrgResponse(organization.getId(), organization.getName(), organization.getAccount());
    }

    @GetMapping("/orgs")
    public List<AdminOrgSummaryResponse> listOrganizations(HttpSession session) {
        ensureLoggedIn(session);
        return adminQueryService.listOrganizations();
    }

    @GetMapping("/orgs/{orgId}/projects")
    public List<AdminProjectSummaryResponse> listProjects(@PathVariable("orgId") Long orgId,
                                                          HttpSession session) {
        ensureLoggedIn(session);
        return adminQueryService.listProjects(orgId);
    }

    @GetMapping("/orgs/{orgId}/members")
    public List<AdminMemberSummaryResponse> listMembers(@PathVariable("orgId") Long orgId,
                                                        HttpSession session) {
        ensureLoggedIn(session);
        return adminQueryService.listMembers(orgId);
    }

    @PostMapping("/orgs/{orgId}/members")
    public AdminMemberSummaryResponse createMember(@PathVariable("orgId") Long orgId,
                                                   @Valid @RequestBody AdminMemberCreateRequest request,
                                                   HttpSession session) {
        ensureLoggedIn(session);
        return adminMemberService.createMember(
            orgId,
            request.getId().trim(),
            request.getName().trim(),
            request.getRole(),
            request.getPassword()
        );
    }

    @PostMapping("/orgs/{orgId}/members/{memberId}/role")
    public AdminMemberSummaryResponse updateMemberRole(@PathVariable("orgId") Long orgId,
                                                       @PathVariable("memberId") String memberId,
                                                       @Valid @RequestBody AdminMemberRoleUpdateRequest request,
                                                       HttpSession session) {
        ensureLoggedIn(session);
        return adminMemberService.updateRole(orgId, memberId, request.getRole());
    }

    @PostMapping("/orgs/{orgId}/members/{memberId}/password")
    public void resetMemberPassword(@PathVariable("orgId") Long orgId,
                                    @PathVariable("memberId") String memberId,
                                    @Valid @RequestBody AdminMemberPasswordResetRequest request,
                                    HttpSession session) {
        ensureLoggedIn(session);
        adminMemberService.resetPassword(orgId, memberId, request.getPassword());
    }

    @DeleteMapping("/orgs/{orgId}/members/{memberId}")
    public void deleteMember(@PathVariable("orgId") Long orgId,
                             @PathVariable("memberId") String memberId,
                             HttpSession session) {
        ensureLoggedIn(session);
        adminMemberService.deleteMember(orgId, memberId);
    }

    private void ensureLoggedIn(HttpSession session) {
        if (!Boolean.TRUE.equals(session.getAttribute(SESSION_KEY))) {
            throw new IllegalArgumentException("未登录管理员");
        }
    }
}
