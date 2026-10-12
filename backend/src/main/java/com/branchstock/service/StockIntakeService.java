package com.branchstock.service;

import com.branchstock.domain.MovementType;
import com.branchstock.domain.Product;
import com.branchstock.domain.StockIntake;
import com.branchstock.domain.StockIntakeLine;
import com.branchstock.domain.StockMovement;
import com.branchstock.domain.UserAccount;
import com.branchstock.domain.WarehouseStock;
import com.branchstock.dto.CreateStockIntakeRequest;
import com.branchstock.dto.StockIntakeDto;
import com.branchstock.dto.StockIntakeItemRequest;
import com.branchstock.dto.StockIntakeLineDto;
import com.branchstock.repo.ProductRepository;
import com.branchstock.repo.StockIntakeRepository;
import com.branchstock.repo.StockMovementRepository;
import com.branchstock.repo.WarehouseStockRepository;
import com.branchstock.web.ApiException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class StockIntakeService {

    private final StockIntakeRepository intakeRepo;
    private final ProductRepository productRepo;
    private final WarehouseStockRepository stockRepo;
    private final StockMovementRepository movementRepo;
    private final CurrentUserService currentUser;

    public StockIntakeService(StockIntakeRepository intakeRepo,
            ProductRepository productRepo,
            WarehouseStockRepository stockRepo,
            StockMovementRepository movementRepo,
            CurrentUserService currentUser) {
        this.intakeRepo = intakeRepo;
        this.productRepo = productRepo;
        this.stockRepo = stockRepo;
        this.movementRepo = movementRepo;
        this.currentUser = currentUser;
    }

    public List<StockIntakeDto> list() {
        return intakeRepo.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    public StockIntakeDto get(String id) {
        StockIntake intake = intakeRepo.findById(id)
                .orElseThrow(() -> new ApiException("Stock update not found"));
        return toDto(intake);
    }

    public StockIntakeDto create(CreateStockIntakeRequest request) {
        UserAccount admin = currentUser.requireUser();
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new ApiException("Add at least one product to the stock update");
        }
        String mode = request.mode() == null || request.mode().isBlank()
                ? "ADD" : request.mode().trim().toUpperCase();
        if (!mode.equals("ADD") && !mode.equals("SET")) {
            throw new ApiException("Mode must be ADD or SET");
        }
        Set<String> seen = new HashSet<>();
        List<Prepared> prepared = new ArrayList<>();
        for (StockIntakeItemRequest item : request.items()) {
            if (item == null || item.productId() == null || item.productId().isBlank()) {
                throw new ApiException("Every row must have a product selected");
            }
            String pid = item.productId().trim();
            if (!seen.add(pid)) {
                throw new ApiException("Duplicate product. Merge into one row.");
            }
            Product product = productRepo.findById(pid)
                    .orElseThrow(() -> new ApiException("Product not found"));
            if (!product.isActive()) {
                throw new ApiException("Product is inactive: " + product.getName());
            }
            WarehouseStock stock = stockRepo.findByProductId(pid)
                    .orElseThrow(() -> new ApiException("Warehouse stock not found"));
            if (mode.equals("ADD") && item.quantity() <= 0) {
                throw new ApiException("Quantity must be > 0 for " + product.getName());
            }
            if (mode.equals("SET") && item.quantity() < 0) {
                throw new ApiException("Quantity cannot be negative for " + product.getName());
            }
            if (mode.equals("SET") && item.quantity() < stock.getReserved()) {
                throw new ApiException("On-hand for " + product.getName()
                        + " cannot be below reserved (" + stock.getReserved() + ")");
            }
            double cost = item.unitCost() == null ? 0 : item.unitCost();
            if (cost < 0) {
                throw new ApiException("Unit cost cannot be negative for " + product.getName());
            }
            prepared.add(new Prepared(product, stock, item.quantity(), cost));
        }
        //APPLYA
        String updatedBy = request.updatedBy() != null && !request.updatedBy().isBlank()
                ? request.updatedBy().trim() : admin.getUsername();
        Instant now = Instant.now();
        StockIntake intake = StockIntake.builder()
                .intakeNo(nextIntakeNo()).mode(mode)
                .supplier(trimOrNull(request.supplier()))
                .referenceNo(trimOrNull(request.referenceNo()))
                .updatedBy(updatedBy).updatedByUsername(admin.getUsername())
                .note(request.note()).details(request.details())
                .createdAt(now).build();
        List<StockIntakeLine> lines = new ArrayList<>();
        int totalQty = 0;
        double totalCost = 0;
        String head = intake.getIntakeNo();
        if (intake.getSupplier() != null && !intake.getSupplier().isBlank()) {
            head = head + " - Supplier: " + intake.getSupplier();
        }
        //APPLYB
        if (request.note() != null && !request.note().isBlank()) {
            head = head + " - " + request.note();
        }
        for (Prepared p : prepared) {
            int previous = p.stock().getOnHand();
            int next = mode.equals("ADD") ? previous + p.qty() : p.qty();
            int delta = next - previous;
            p.stock().setOnHand(next);
            stockRepo.save(p.stock());
            if (delta != 0) {
                movementRepo.save(StockMovement.builder()
                        .productId(p.product().getId())
                        .type(delta > 0 ? MovementType.INBOUND : MovementType.ADJUSTMENT)
                        .quantity(Math.abs(delta)).note(head).createdAt(now).build());
            }
            lines.add(StockIntakeLine.builder()
                    .productId(p.product().getId()).sku(p.product().getSku())
                    .productName(p.product().getName()).category(p.product().getCategory())
                    .unit(p.product().getUnit()).quantity(p.qty())
                    .unitCost(p.unitCost()).lineCost(p.unitCost() * p.qty())
                    .previousOnHand(previous).newOnHand(next).build());
            totalCost = totalCost + (p.unitCost() * p.qty());
            if (mode.equals("ADD")) {
                totalQty = totalQty + p.qty();
            } else {
                totalQty = totalQty + Math.abs(delta);
            }
        }
        intake.setLines(lines);
        intake.setLineCount(lines.size());
        intake.setTotalQuantity(totalQty);
        intake.setTotalCost(totalCost);
        return toDto(intakeRepo.save(intake));
    }

    private String trimOrNull(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private String nextIntakeNo() {
        String datePart = LocalDate.now(ZoneId.systemDefault()).toString().replace("-", "");
        String prefix = "GRN-" + datePart + "-";
        long n = intakeRepo.countByIntakeNoStartingWith(prefix);
        for (int attempt = 0; attempt < 1000; attempt++) {
            String cand = prefix + String.format("%04d", n + 1 + attempt);
            if (!intakeRepo.existsByIntakeNo(cand)) {
                return cand;
            }
        }
        return "GRN-" + datePart + "-" + System.currentTimeMillis();
    }

    public StockIntakeDto toDto(StockIntake intake) {
        List<StockIntakeLineDto> lines = intake.getLines() == null ? List.of()
                : intake.getLines().stream().map(l -> new StockIntakeLineDto(
                        l.getProductId(), l.getSku(), l.getProductName(),
                        l.getCategory(), l.getUnit(), l.getQuantity(),
                        l.getUnitCost(), l.getLineCost(),
                        l.getPreviousOnHand(), l.getNewOnHand())).toList();
        return new StockIntakeDto(
                intake.getId(), intake.getIntakeNo(), intake.getMode(),
                intake.getSupplier(), intake.getReferenceNo(),
                intake.getUpdatedBy(), intake.getUpdatedByUsername(),
                intake.getNote(), intake.getDetails(),
                lines, intake.getTotalQuantity(), intake.getTotalCost(), intake.getLineCount(),
                intake.getCreatedAt());
    }

    private record Prepared(Product product, WarehouseStock stock, int qty, double unitCost) {
    }
}
