package com.branchstock.service;

import com.branchstock.domain.BranchHolding;
import com.branchstock.domain.Product;
import com.branchstock.domain.RequestStatus;
import com.branchstock.domain.Role;
import com.branchstock.domain.StockRequest;
import com.branchstock.domain.StockRequestLine;
import com.branchstock.domain.UserAccount;
import com.branchstock.dto.AdjustLineRequestDto;
import com.branchstock.dto.ApproveRequestDto;
import com.branchstock.dto.CreateRequestDto;
import com.branchstock.dto.HoldingDto;
import com.branchstock.dto.StockRequestDto;
import com.branchstock.dto.StockRequestLineDto;
import com.branchstock.repo.BranchHoldingRepository;
import com.branchstock.repo.ProductRepository;
import com.branchstock.repo.StockRequestRepository;
import com.branchstock.repo.UserAccountRepository;
import com.branchstock.web.ApiException;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Branch stock requests.
 *
 * Lifecycle: a branch user creates a request (stock is RESERVED in the warehouse).
 * An admin then approves it line by line (the approved quantity is shipped into the
 * branch holding and any remainder is released) or rejects it (everything is released).
 * The branch user, or an admin, can cancel while it is still RESERVED.
 */
@Service
public class RequestService {

    private final StockRequestRepository requestRepo;
    private final ProductRepository productRepo;
    private final BranchHoldingRepository holdingRepo;
    private final UserAccountRepository userRepo;
    private final WarehouseService warehouseService;
    private final CurrentUserService currentUser;
    private final MongoTemplate mongo;

    public RequestService(
            StockRequestRepository requestRepo,
            ProductRepository productRepo,
            BranchHoldingRepository holdingRepo,
            UserAccountRepository userRepo,
            WarehouseService warehouseService,
            CurrentUserService currentUser,
            MongoTemplate mongo
    ) {
        this.requestRepo = requestRepo;
        this.productRepo = productRepo;
        this.holdingRepo = holdingRepo;
        this.userRepo = userRepo;
        this.warehouseService = warehouseService;
        this.currentUser = currentUser;
        this.mongo = mongo;
    }

    // ------------------------------------------------------------------ queries

    public List<StockRequestDto> list() {
        UserAccount user = currentUser.requireUser();
        List<StockRequest> rows = isBranchUser(user)
                ? requestRepo.findByBranchIdOrderByCreatedAtDesc(requireBranchId(user))
                : requestRepo.findAllByOrderByCreatedAtDesc();
        return toDtos(rows);
    }

    public List<StockRequestDto> listByStatus(RequestStatus status) {
        UserAccount user = currentUser.requireUser();
        List<StockRequest> rows = requestRepo.findByStatusOrderByCreatedAtDesc(status);
        if (isBranchUser(user)) {
            String branchId = requireBranchId(user);
            rows = rows.stream().filter(r -> branchId.equals(r.getBranchId())).toList();
        }
        return toDtos(rows);
    }

    public StockRequestDto get(String id) {
        StockRequest request = require(id);
        assertCanView(currentUser.requireUser(), request);
        return toDto(request, new HashMap<>());
    }

    public List<HoldingDto> holdings() {
        UserAccount user = currentUser.requireUser();
        List<BranchHolding> rows = isBranchUser(user)
                ? holdingRepo.findByBranchId(requireBranchId(user))
                : holdingRepo.findAll();
        return rows.stream().map(this::toHolding).toList();
    }

    // ----------------------------------------------------------------- commands

    public StockRequestDto create(CreateRequestDto dto) {
        UserAccount user = currentUser.requireUser();
        if (user.getRole() != Role.BRANCH_USER) {
            throw new ApiException("Only branch users can request stock");
        }
        String branchId = requireBranchId(user);
        if (dto == null || dto.items() == null || dto.items().isEmpty()) {
            throw new ApiException("Add at least one item");
        }

        // Validate and merge duplicate products into one line each.
        Map<String, Integer> quantities = new LinkedHashMap<>();
        Map<String, String> notes = new HashMap<>();
        for (CreateRequestDto.LineItem item : dto.items()) {
            if (item == null || item.productId() == null || item.productId().isBlank()) {
                throw new ApiException("Product is required");
            }
            if (item.quantity() <= 0) {
                throw new ApiException("Quantity must be greater than zero");
            }
            quantities.merge(item.productId(), item.quantity(), Integer::sum);
            if (item.notes() != null && !item.notes().isBlank()) {
                notes.putIfAbsent(item.productId(), item.notes().trim());
            }
        }

        String requestId = new ObjectId().toHexString();
        Instant now = Instant.now();
        List<StockRequestLine> lines = new ArrayList<>();
        List<Reservation> reserved = new ArrayList<>();
        int total = 0;
        try {
            for (Map.Entry<String, Integer> entry : quantities.entrySet()) {
                Product product = requireProduct(entry.getKey());
                if (!product.isActive()) {
                    throw new ApiException("Product is inactive: " + product.getName());
                }
                int qty = entry.getValue();
                warehouseService.reserve(product, qty);
                reserved.add(new Reservation(product, qty));
                lines.add(StockRequestLine.builder()
                        .id(new ObjectId().toHexString())
                        .requestId(requestId)
                        .productId(product.getId())
                        .productName(product.getName())
                        .sku(product.getSku())
                        .unit(product.getUnit())
                        .quantity(qty)
                        .requestedQuantity(qty)
                        .approvedQuantity(0)
                        .notes(notes.get(entry.getKey()))
                        .requestedBy(user.getUsername())
                        .createdAt(now)
                        .build());
                total += qty;
            }
        } catch (RuntimeException e) {
            // No multi-document rollback here, so give back whatever was already reserved.
            for (Reservation r : reserved) {
                warehouseService.release(r.product(), r.quantity());
            }
            throw e;
        }

        StockRequest request = requestRepo.save(StockRequest.builder()
                .id(requestId)
                .branchId(branchId)
                .branchName(user.getBranchName())
                .requestedBy(user.getUsername())
                .notes(dto.notes())
                .status(RequestStatus.RESERVED)
                .lines(lines)
                .totalQuantity(total)
                .createdAt(now)
                .updatedAt(now)
                .build());
        return toDto(request, new HashMap<>());
    }

    public StockRequestDto cancel(String id) {
        StockRequest request = require(id);
        UserAccount user = currentUser.requireUser();
        if (isBranchUser(user)) {
            if (!requireBranchId(user).equals(request.getBranchId())) {
                throw new ApiException("You can only cancel your branch requests");
            }
        } else {
            requireAdmin();
        }
        requireReserved(request, "cancelled");
        releaseAll(request);
        request.setStatus(RequestStatus.CANCELLED);
        request.setUpdatedAt(Instant.now());
        return toDto(requestRepo.save(request), new HashMap<>());
    }

    public StockRequestDto reject(String id) {
        requireAdmin();
        StockRequest request = require(id);
        requireReserved(request, "rejected");
        releaseAll(request);
        Instant now = Instant.now();
        for (StockRequestLine line : request.getLines()) {
            line.setApproved(false);
            line.setRejected(true);
            line.setApprovedQuantity(0);
            line.setUpdatedAt(now);
        }
        request.setStatus(RequestStatus.REJECTED);
        request.setUpdatedAt(now);
        return toDto(requestRepo.save(request), new HashMap<>());
    }

    public StockRequestDto approve(String id, ApproveRequestDto dto) {
        requireAdmin();
        StockRequest request = require(id);
        requireReserved(request, "approved");
        if (dto == null || dto.lines() == null || dto.lines().isEmpty()) {
            throw new ApiException("No approval decisions supplied");
        }

        Map<String, ApproveRequestDto.ApprovalLine> decisions = new HashMap<>();
        for (ApproveRequestDto.ApprovalLine d : dto.lines()) {
            decisions.put(d.id(), d);
        }

        // Validate every line before touching any stock.
        for (StockRequestLine line : request.getLines()) {
            ApproveRequestDto.ApprovalLine d = decisions.get(line.getId());
            if (d == null) {
                throw new ApiException("Missing decision for " + line.getProductName());
            }
            if (d.approved() == d.rejected()) {
                throw new ApiException(line.getProductName() + " must be either approved or rejected");
            }
            if (d.approved() && (d.quantity() < 0 || d.quantity() > line.getRequestedQuantity())) {
                throw new ApiException("Approved quantity for " + line.getProductName()
                        + " must be between 0 and " + line.getRequestedQuantity());
            }
        }

        Instant now = Instant.now();
        for (StockRequestLine line : request.getLines()) {
            if (line.isApproved() || line.isRejected()) {
                continue; // already decided by an earlier, interrupted attempt
            }
            ApproveRequestDto.ApprovalLine d = decisions.get(line.getId());
            int approvedQty = d.approved() ? d.quantity() : 0;
            Product product = requireProduct(line.getProductId());
            if (approvedQty > 0) {
                warehouseService.ship(product, approvedQty);
                addToHolding(request, line, approvedQty);
            }
            int leftover = line.getRequestedQuantity() - approvedQty;
            if (leftover > 0) {
                warehouseService.release(product, leftover);
            }
            line.setApprovedQuantity(approvedQty);
            line.setApproved(approvedQty > 0);
            line.setRejected(approvedQty == 0);
            line.setUpdatedAt(now);
            requestRepo.save(request);
        }

        request.setStatus(computeStatus(request));
        request.setUpdatedAt(now);
        return toDto(requestRepo.save(request), new HashMap<>());
    }

    /** Sets the proposed approved quantity per line without shipping anything yet. */
    public StockRequestDto adjustLines(String id, AdjustLineRequestDto dto) {
        requireAdmin();
        StockRequest request = require(id);
        requireReserved(request, "adjusted");
        if (dto == null || dto.adjustments() == null || dto.adjustments().isEmpty()) {
            throw new ApiException("No adjustments supplied");
        }
        Map<String, StockRequestLine> byId = new HashMap<>();
        for (StockRequestLine line : request.getLines()) {
            byId.put(line.getId(), line);
        }
        Instant now = Instant.now();
        for (AdjustLineRequestDto.LineAdjustment adj : dto.adjustments()) {
            StockRequestLine line = byId.get(adj.id());
            if (line == null) {
                throw new ApiException("Request line not found: " + adj.id());
            }
            if (adj.quantity() < 0 || adj.quantity() > line.getRequestedQuantity()) {
                throw new ApiException("Quantity for " + line.getProductName()
                        + " must be between 0 and " + line.getRequestedQuantity());
            }
            line.setApprovedQuantity(adj.quantity());
            line.setUpdatedAt(now);
        }
        request.setUpdatedAt(now);
        return toDto(requestRepo.save(request), new HashMap<>());
    }

    // ------------------------------------------------------------------ helpers

    private RequestStatus computeStatus(StockRequest request) {
        boolean anyApproved = false;
        boolean allFull = true;
        for (StockRequestLine line : request.getLines()) {
            if (line.isApproved()) {
                anyApproved = true;
                if (line.getApprovedQuantity() < line.getRequestedQuantity()) {
                    allFull = false;
                }
            } else {
                allFull = false;
            }
        }
        if (!anyApproved) {
            return RequestStatus.REJECTED;
        }
        return allFull ? RequestStatus.APPROVED : RequestStatus.PARTIALLY_APPROVED;
    }

    private void releaseAll(StockRequest request) {
        for (StockRequestLine line : request.getLines()) {
            warehouseService.release(requireProduct(line.getProductId()), line.getRequestedQuantity());
        }
    }

    private void addToHolding(StockRequest request, StockRequestLine line, int qty) {
        // Atomic upsert + increment: concurrent approvals/sales cannot overwrite each other.
        Query q = new Query(Criteria.where("branchId").is(request.getBranchId())
                .and("productId").is(line.getProductId()));
        Update u = new Update().inc("quantity", qty).setOnInsert("branchName", request.getBranchName());
        mongo.upsert(q, u, BranchHolding.class);
    }

    private boolean isBranchUser(UserAccount user) {
        return user.getRole() == Role.BRANCH_USER;
    }

    private String requireBranchId(UserAccount user) {
        if (user.getBranchId() == null || user.getBranchId().isBlank()) {
            throw new ApiException("User is not assigned to a branch");
        }
        return user.getBranchId();
    }

    private void assertCanView(UserAccount user, StockRequest request) {
        if (isBranchUser(user) && !requireBranchId(user).equals(request.getBranchId())) {
            throw new ApiException("Request not found");
        }
    }

    private void requireAdmin() {
        if (!currentUser.isAdmin()) {
            throw new ApiException("Admin only");
        }
    }

    private void requireReserved(StockRequest request, String action) {
        if (request.getStatus() != RequestStatus.RESERVED) {
            throw new ApiException("Only reserved requests can be " + action);
        }
    }

    private Product requireProduct(String productId) {
        return productRepo.findById(productId).orElseThrow(() -> new ApiException("Product not found"));
    }

    private StockRequest require(String id) {
        return requestRepo.findById(id).orElseThrow(() -> new ApiException("Request not found"));
    }

    private List<StockRequestDto> toDtos(List<StockRequest> rows) {
        Map<String, String> names = new HashMap<>();
        return rows.stream().map(r -> toDto(r, names)).toList();
    }

    private StockRequestDto toDto(StockRequest r, Map<String, String> displayNames) {
        String username = r.getRequestedBy();
        String requestedBy = username == null ? "" : displayNames.computeIfAbsent(username, u ->
                userRepo.findByUsername(u)
                        .map(UserAccount::getDisplayName)
                        .filter(n -> n != null && !n.isBlank())
                        .orElse(u));
        List<StockRequestLineDto> lines = r.getLines().stream().map(l -> toLineDto(r, l)).toList();
        return new StockRequestDto(
                r.getId(),
                r.getBranchId(),
                r.getBranchName(),
                requestedBy,
                r.getNotes(),
                r.getStatus(),
                lines,
                r.getTotalQuantity(),
                r.getCreatedAt()
        );
    }

    private StockRequestLineDto toLineDto(StockRequest request, StockRequestLine l) {
        RequestStatus lineStatus;
        if (l.isRejected()) {
            lineStatus = RequestStatus.REJECTED;
        } else if (l.isApproved()) {
            lineStatus = l.getApprovedQuantity() < l.getRequestedQuantity()
                    ? RequestStatus.PARTIALLY_APPROVED
                    : RequestStatus.APPROVED;
        } else {
            lineStatus = request.getStatus() == RequestStatus.CANCELLED
                    ? RequestStatus.CANCELLED
                    : RequestStatus.RESERVED;
        }
        return new StockRequestLineDto(
                l.getId(),
                l.getProductId(),
                l.getSku(),
                l.getProductName(),
                l.getUnit(),
                l.getRequestedQuantity(),
                l.getApprovedQuantity(),
                lineStatus,
                l.getNotes(),
                l.isApproved(),
                l.isRejected()
        );
    }

    private HoldingDto toHolding(BranchHolding h) {
        Product p = productRepo.findById(h.getProductId()).orElse(null);
        return new HoldingDto(
                h.getBranchId(),
                h.getBranchName(),
                h.getProductId(),
                p != null ? p.getSku() : h.getProductId(),
                p != null ? p.getName() : h.getProductId(),
                p != null ? p.getUnit() : "",
                h.getQuantity()
        );
    }

    private record Reservation(Product product, int quantity) {
    }
}
