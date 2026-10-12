package com.branchstock.dto;

import java.util.List;

public record CreateSaleRequest(
        String customerName,
        String customerPhone,
        String customerEmail,
        String customerAddress,
        List<CreateSoldItemRequest> items
) {
}