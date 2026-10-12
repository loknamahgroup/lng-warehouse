package com.branchstock.dto;

import java.util.List;

public record DashboardDto(
        long productCount,
        long branchCount,
        int warehouseOnHand,
        int warehouseReserved,
        int warehouseAvailable,
        long openRequests,
        int totalBranchHoldings,
        List<WarehouseStockDto> lowStock,
        List<HoldingSummary> holdingsByBranch
) {
    public record HoldingSummary(String branchId, String branchName, int totalUnits, long productLines) {
    }
}
