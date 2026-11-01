package com.branchstock.dto;

import com.branchstock.domain.RequestStatus;

import java.time.Instant;
import java.util.List;

public record StockRequestLineDto(
        String id,
        String productId,
        String sku,
        String productName,
        String unit,
        int requestedQuantity,
        int approvedQuantity,
        RequestStatus lineStatus,
        String notes,
        boolean approved,
        boolean rejected
) {
}

