package com.branchstock.dto;

import com.branchstock.domain.RequestStatus;

import java.time.Instant;
import java.util.List;

public record StockRequestDto(
        String id,
        String branchId,
        String branchName,
        String requestedBy,
        String notes,
        RequestStatus status,
        List<StockRequestLineDto> lines,
        int totalQuantity,
        Instant createdAt
) {
}
