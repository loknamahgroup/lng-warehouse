package com.branchstock.dto;

public record StockIntakeItemRequest(
        String productId,
        int quantity,
        Double unitCost
) {
}
