package com.branchstock.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ApproveRequestDto(
        List<ApprovalLine> lines
) {
    public record ApprovalLine(
            @NotBlank(message = "Line ID is required")
            String id,
            @Min(value = 0, message = "Quantity cannot be negative")
            int quantity,
            boolean approved,
            boolean rejected
    ) {}
}