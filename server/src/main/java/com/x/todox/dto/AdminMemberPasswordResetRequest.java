package com.x.todox.dto;

import javax.validation.constraints.NotBlank;

public class AdminMemberPasswordResetRequest {

    @NotBlank(message = "成员密码不能为空")
    private String password;

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
