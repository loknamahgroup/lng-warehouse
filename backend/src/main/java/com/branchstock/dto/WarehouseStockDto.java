package com.branchstock.dto;

public record WarehouseStockDto(
        String productId,
        String sku,
        String name,
        String category,
        String unit,
        int onHand,
        int reserved,
        int available,
        int reorderLevel,
        boolean lowStock
) {
}
