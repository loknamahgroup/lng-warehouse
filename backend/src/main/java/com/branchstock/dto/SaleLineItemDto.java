package com.branchstock.dto;

public record SaleLineItemDto(
        String productId,
        String sku,
        String productName,
        int quantity,
        double price,
        double amount
) {
}