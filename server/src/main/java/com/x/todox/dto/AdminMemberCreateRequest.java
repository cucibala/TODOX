package com.x.todox.dto;

import javax.validation.constraints.NotBlank;

public class AdminMemberCreateRequest {

    @NotBlank(message = "成员账号不能为空")
    private String id;

    @NotBlank(message = "成员姓名不能为空")
    private String name;

    private String role;

    @NotBlank(message = "成员密码不能为空")
    private String password;

    public String getName() {
        return name;
    }

    public String getId() {
        return id;
    }

    public String getRole() {
        return role;
    }

    public String getPassword() {
        return password;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
