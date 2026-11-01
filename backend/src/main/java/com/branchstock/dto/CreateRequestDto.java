package com.branchstock.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CreateRequestDto(
        List<LineItem> items,
        String notes
) {
    public record LineItem(
            @NotBlank(message = "Product ID is required")
            String productId,
            @Min(value = 1, message = "Quantity must be at least 1")
            int quantity,
            String notes
    ) {}
}
