package com.branchstock.service;

import org.bson.Document;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
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
    private final MongoTemplate mongo;
    private static final FindAndModifyOptions RETURN_NEW = FindAndModifyOptions.options().returnNew(true);

    public WarehouseService(
            WarehouseStockRepository stockRepo,
            ProductRepository productRepo,
            StockMovementRepository movementRepo,
            BranchRepository branchRepo,
            ProductService productService,
            MongoTemplate mongo
    ) {
        this.stockRepo = stockRepo;
        this.productRepo = productRepo;
        this.movementRepo = movementRepo;
        this.branchRepo = branchRepo;
        this.productService = productService;
        this.mongo = mongo;
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

    /**
     * Stock changes below are single conditional MongoDB updates, so two concurrent
     * requests can never both pass the availability check (no lost updates / overselling).
     */
    public void reserve(Product product, int qty) {
        requireStock(product.getId());
        Document filter = new Document("productId", product.getId())
                .append("$expr", new Document("$gte", List.of(
                        new Document("$subtract", List.of("$onHand", "$reserved")), qty)));
        WarehouseStock updated = mongo.findAndModify(
                new BasicQuery(filter), new Update().inc("reserved", qty), RETURN_NEW, WarehouseStock.class);
        if (updated == null) {
            WarehouseStock current = requireStock(product.getId());
            throw new ApiException("Not enough available warehouse stock. Available: " + current.getAvailable());
        }
        recordMovement(product, MovementType.RESERVE, qty);
    }

    public void release(Product product, int qty) {
        requireStock(product.getId());
        Query enough = new Query(Criteria.where("productId").is(product.getId()).and("reserved").gte(qty));
        WarehouseStock updated = mongo.findAndModify(enough, new Update().inc("reserved", -qty), RETURN_NEW, WarehouseStock.class);
        if (updated == null) {
            // Reserved count is already lower than expected (legacy data): clamp to zero instead of going negative.
            mongo.updateFirst(new Query(Criteria.where("productId").is(product.getId())),
                    new Update().set("reserved", 0), WarehouseStock.class);
        }
        recordMovement(product, MovementType.RELEASE, qty);
    }

    public void ship(Product product, int qty) {
        requireStock(product.getId());
        Query enough = new Query(Criteria.where("productId").is(product.getId())
                .and("reserved").gte(qty).and("onHand").gte(qty));
        WarehouseStock updated = mongo.findAndModify(
                enough, new Update().inc("reserved", -qty).inc("onHand", -qty), RETURN_NEW, WarehouseStock.class);
        if (updated == null) {
            throw new ApiException("Cannot ship more than reserved/on-hand stock");
        }
        recordMovement(product, MovementType.SHIP, qty);
    }

    private void recordMovement(Product product, MovementType type, int qty) {
        movementRepo.save(StockMovement.builder()
                .productId(product.getId())
                .type(type)
                .quantity(qty)
                .createdAt(Instant.now())
                .build());
    }

    private WarehouseStock requireStock(String productId) {
        productRepo.findById(productId).orElseThrow(() -> new ApiException("Product not found"));
        return stockRepo.findByProductId(productId).orElseThrow(() -> new ApiException("Warehouse stock not found"));
    }
}
