package com.branchstock.dto;

public record HoldingDto(
        String branchId,
        String branchName,
        String productId,
        String sku,
        String productName,
        String unit,
        int quantity
) {
}
