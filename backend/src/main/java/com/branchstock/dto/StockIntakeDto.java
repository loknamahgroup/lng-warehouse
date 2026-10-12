package com.branchstock.dto;

import java.time.Instant;
import java.util.List;

public record StockIntakeDto(
        String id,
        String intakeNo,
        String mode,
        String supplier,
        String referenceNo,
        String updatedBy,
        String updatedByUsername,
        String note,
        String details,
        List<StockIntakeLineDto> lines,
        int totalQuantity,
        double totalCost,
        int lineCount,
        Instant createdAt
) {
}
