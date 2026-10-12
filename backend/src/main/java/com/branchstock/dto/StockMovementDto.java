package com.branchstock.dto;

import com.branchstock.domain.MovementType;

import java.time.Instant;

public record StockMovementDto(
        String id,
        String productId,
        String sku,
        String productName,
        String branchName,
        MovementType type,
        int quantity,
        String note,
        Instant createdAt
) {
}