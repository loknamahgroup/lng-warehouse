package com.branchstock.dto;

import java.time.Instant;
import java.util.List;

public record SaleInvoiceDto(
        String id,
        String invoiceNo,
        String branchId,
        String branchName,
        String userId,
        String username,
        String soldBy,
        String customerName,
        String customerPhone,
        String customerEmail,
        String customerAddress,
        Instant soldAt,
        List<SaleLineItemDto> items,
        double total
) {
}