package com.branchstock.dto;

import com.branchstock.domain.Role;

public record UserDto(String id, String username, String displayName, Role role, String branchId, String branchName, boolean active) {
}
