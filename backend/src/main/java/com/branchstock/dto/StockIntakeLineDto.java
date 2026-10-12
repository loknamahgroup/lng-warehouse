package com.branchstock.dto;

public record StockIntakeLineDto(
        String productId,
        String sku,
        String productName,
        String category,
        String unit,
        int quantity,
        double unitCost,
        double lineCost,
        int previousOnHand,
        int newOnHand
) {
}
