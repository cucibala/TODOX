package com.x.todox.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AdminPageController {

    @GetMapping("/admin/login")
    public String loginPage() {
        return "forward:/admin/login.html";
    }

    @GetMapping("/admin/orgs")
    public String orgPage() {
        return "forward:/admin/orgs.html";
    }
}
