package com.x.todox.controller;

import com.x.todox.dto.AdminCreateOrgRequest;
import com.x.todox.dto.AdminCreateOrgResponse;
import com.x.todox.dto.AdminLoginRequest;
import com.x.todox.dto.AdminLoginResponse;
import com.x.todox.dto.AdminSessionResponse;
import com.x.todox.entity.Organization;
import com.x.todox.service.AdminAuthService;
import com.x.todox.service.AdminOrganizationService;
import javax.servlet.http.HttpSession;
import javax.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    public AdminController(AdminAuthService adminAuthService,
                           AdminOrganizationService adminOrganizationService) {
        this.adminAuthService = adminAuthService;
        this.adminOrganizationService = adminOrganizationService;
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
            request.getAccount().trim(),
            request.getPassword()
        );
        return new AdminCreateOrgResponse(organization.getId(), organization.getName(), organization.getAccount());
    }

    private void ensureLoggedIn(HttpSession session) {
        if (!Boolean.TRUE.equals(session.getAttribute(SESSION_KEY))) {
            throw new IllegalArgumentException("未登录管理员");
        }
    }
}
