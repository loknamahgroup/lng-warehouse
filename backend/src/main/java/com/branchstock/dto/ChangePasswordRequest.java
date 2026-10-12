package com.branchstock.dto;

public record ChangePasswordRequest(String currentPassword, String newPassword) {
}