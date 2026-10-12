package com.branchstock.web;

import com.branchstock.dto.StockMovementDto;
import com.branchstock.dto.StockSetRequest;
import com.branchstock.dto.WarehouseStockDto;
import com.branchstock.service.WarehouseService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouse")
public class WarehouseController {

    private final WarehouseService warehouseService;

    public WarehouseController(WarehouseService warehouseService) {
        this.warehouseService = warehouseService;
    }

    @GetMapping
    public List<WarehouseStockDto> list() {
        return warehouseService.list();
    }

    @GetMapping("/movements")
    @PreAuthorize("hasRole('ADMIN')")
    public List<StockMovementDto> movements() {
        return warehouseService.listMovements();
    }

    @PutMapping("/{productId}")
    @PreAuthorize("hasRole('ADMIN')")
    public WarehouseStockDto setOnHand(@PathVariable String productId, @RequestBody StockSetRequest request) {
        return warehouseService.setOnHand(productId, request);
    }
}
