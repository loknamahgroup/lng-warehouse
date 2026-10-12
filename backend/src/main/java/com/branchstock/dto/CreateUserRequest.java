package com.branchstock.dto;

import com.branchstock.domain.Role;

public record CreateUserRequest(String username, String password, String displayName, Role role, String branchId, Boolean active) {
}
