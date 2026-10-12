package com.branchstock.dto;

public record ProductDto(
        String id,
        String sku,
        String name,
        String category,
        String unit,
        String description,
        int reorderLevel,
        boolean active
) {
}
