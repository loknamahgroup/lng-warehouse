package com.branchstock.dto;

import com.branchstock.domain.Role;

public record LoginResponse(
        String token,
        String username,
        String displayName,
        Role role,
        String branchId,
        String branchName
) {
}
