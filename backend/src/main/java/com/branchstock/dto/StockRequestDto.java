package com.branchstock.dto;

import com.branchstock.domain.RequestStatus;

import java.time.Instant;

public record StockRequestDto(
        String id,
        String branchId,
        String branchName,
        String productId,
        String sku,
        String productName,
        String requestedBy,
        int quantity,
        RequestStatus status,
        String notes,
        Instant createdAt
) {
}
