package com.branchstock.service;

import com.branchstock.domain.Branch;
import com.branchstock.domain.MovementType;
import com.branchstock.domain.Product;
import com.branchstock.domain.StockMovement;
import com.branchstock.domain.WarehouseStock;
import com.branchstock.dto.StockMovementDto;
import com.branchstock.dto.StockSetRequest;
import com.branchstock.dto.WarehouseStockDto;
import com.branchstock.repo.BranchRepository;
import com.branchstock.repo.ProductRepository;
import com.branchstock.repo.StockMovementRepository;
import com.branchstock.repo.WarehouseStockRepository;
import com.branchstock.web.ApiException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
public class WarehouseService {

    private final WarehouseStockRepository stockRepo;
    private final ProductRepository productRepo;
    private final StockMovementRepository movementRepo;
    private final BranchRepository branchRepo;
    private final ProductService productService;

    public WarehouseService(
            WarehouseStockRepository stockRepo,
            ProductRepository productRepo,
            StockMovementRepository movementRepo,
            BranchRepository branchRepo,
            ProductService productService
    ) {
        this.stockRepo = stockRepo;
        this.productRepo = productRepo;
        this.movementRepo = movementRepo;
        this.branchRepo = branchRepo;
        this.productService = productService;
    }

    public List<WarehouseStockDto> list() {
        return stockRepo.findAll().stream()
                .map(productService::toStockDto)
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(WarehouseStockDto::sku))
                .toList();
    }

    public List<StockMovementDto> listMovements() {
        return movementRepo.findAllByOrderByCreatedAtDesc().stream().map(m -> {
            Product p = productRepo.findById(m.getProductId()).orElse(null);
            String branchName = null;
            if (m.getBranchId() != null) {
                branchName = branchRepo.findById(m.getBranchId()).map(Branch::getName).orElse(null);
            }
            return new StockMovementDto(
                    m.getId(),
                    m.getProductId(),
                    p != null ? p.getSku() : m.getProductId(),
                    p != null ? p.getName() : m.getProductId(),
                    branchName,
                    m.getType(),
                    m.getQuantity(),
                    m.getNote(),
                    m.getCreatedAt()
            );
        }).toList();
    }

    public WarehouseStockDto setOnHand(String productId, StockSetRequest request) {
        if (request.onHand() < 0) {
            throw new ApiException("Quantity cannot be negative");
        }
        WarehouseStock stock = requireStock(productId);
        if (request.onHand() < stock.getReserved()) {
            throw new ApiException("On-hand cannot be less than reserved quantity (" + stock.getReserved() + ")");
        }
        int delta = request.onHand() - stock.getOnHand();
        stock.setOnHand(request.onHand());
        movementRepo.save(StockMovement.builder()
                .productId(productId)
                .type(delta >= 0 ? MovementType.INBOUND : MovementType.ADJUSTMENT)
                .quantity(Math.abs(delta))
                .note(request.note())
                .createdAt(Instant.now())
                .build());
        return productService.toStockDto(stockRepo.save(stock));
    }

    public void reserve(Product product, int qty) {
        WarehouseStock stock = requireStock(product.getId());
        if (stock.getAvailable() < qty) {
            throw new ApiException("Not enough available warehouse stock. Available: " + stock.getAvailable());
        }
        stock.setReserved(stock.getReserved() + qty);
        movementRepo.save(StockMovement.builder()
                .productId(product.getId())
                .type(MovementType.RESERVE)
                .quantity(qty)
                .createdAt(Instant.now())
                .build());
        stockRepo.save(stock);
    }

    public void release(Product product, int qty) {
        WarehouseStock stock = requireStock(product.getId());
        stock.setReserved(Math.max(0, stock.getReserved() - qty));
        movementRepo.save(StockMovement.builder()
                .productId(product.getId())
                .type(MovementType.RELEASE)
                .quantity(qty)
                .createdAt(Instant.now())
                .build());
        stockRepo.save(stock);
    }

    public void ship(Product product, int qty) {
        WarehouseStock stock = requireStock(product.getId());
        if (stock.getReserved() < qty || stock.getOnHand() < qty) {
            throw new ApiException("Cannot ship more than reserved/on-hand stock");
        }
        stock.setReserved(stock.getReserved() - qty);
        stock.setOnHand(stock.getOnHand() - qty);
        movementRepo.save(StockMovement.builder()
                .productId(product.getId())
                .type(MovementType.SHIP)
                .quantity(qty)
                .createdAt(Instant.now())
                .build());
        stockRepo.save(stock);
    }

    private WarehouseStock requireStock(String productId) {
        productRepo.findById(productId).orElseThrow(() -> new ApiException("Product not found"));
        return stockRepo.findByProductId(productId).orElseThrow(() -> new ApiException("Warehouse stock not found"));
    }
}
