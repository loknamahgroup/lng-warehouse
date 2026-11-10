package com.branchstock.dto;

import com.branchstock.domain.Role;

import java.util.List;

public record UserDto(String id, String username, String displayName, Role role, String branchId, String branchName, boolean active, List<String> permissions) {
}
