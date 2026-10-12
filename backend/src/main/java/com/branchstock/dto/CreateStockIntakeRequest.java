package com.branchstock.dto;

import java.util.List;

public record CreateStockIntakeRequest(
        String mode,
        String supplier,
        String referenceNo,
        String updatedBy,
        String note,
        String details,
        List<StockIntakeItemRequest> items
) {
}
