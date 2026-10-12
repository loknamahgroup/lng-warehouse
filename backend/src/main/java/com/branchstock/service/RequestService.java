package com.branchstock.service;

import com.branchstock.domain.Branch;
import com.branchstock.domain.BranchHolding;
import com.branchstock.domain.Product;
import com.branchstock.domain.RequestStatus;
import com.branchstock.domain.Role;
import com.branchstock.domain.StockRequest;
import com.branchstock.domain.UserAccount;
import com.branchstock.dto.CreateRequestDto;
import com.branchstock.dto.HoldingDto;
import com.branchstock.dto.StockRequestDto;
import com.branchstock.repo.BranchHoldingRepository;
import com.branchstock.repo.ProductRepository;
import com.branchstock.repo.StockRequestRepository;
import com.branchstock.repo.UserAccountRepository;
import com.branchstock.web.ApiException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class RequestService {

    private final StockRequestRepository requestRepo;
    private final ProductRepository productRepo;
    private final BranchHoldingRepository holdingRepo;
    private final UserAccountRepository userRepo;
    private final WarehouseService warehouseService;
    private final CurrentUserService currentUser;

    public RequestService(
            StockRequestRepository requestRepo,
            ProductRepository productRepo,
            BranchHoldingRepository holdingRepo,
            UserAccountRepository userRepo,
            WarehouseService warehouseService,
            CurrentUserService currentUser
    ) {
        this.requestRepo = requestRepo;
        this.productRepo = productRepo;
        this.holdingRepo = holdingRepo;
        this.userRepo = userRepo;
        this.warehouseService = warehouseService;
        this.currentUser = currentUser;
    }

    public List<StockRequestDto> list() {
        UserAccount user = currentUser.requireUser();
        List<StockRequest> rows = user.getRole() == Role.ADMIN
                ? requestRepo.findAllByOrderByCreatedAtDesc()
                : requestRepo.findByBranchIdOrderByCreatedAtDesc(requireBranch(user).getId());
        return rows.stream().map(this::toDto).toList();
    }

    public StockRequestDto create(CreateRequestDto dto) {
        UserAccount user = currentUser.requireUser();
        if (user.getRole() != Role.BRANCH_USER) {
            throw new ApiException("Only branch users can request stock");
        }
        Branch branch = requireBranch(user);
        if (dto.quantity() <= 0) {
            throw new ApiException("Quantity must be greater than zero");
        }
        Product product = productRepo.findById(dto.productId()).orElseThrow(() -> new ApiException("Product not found"));
        if (!product.isActive()) {
            throw new ApiException("Product is inactive");
        }
        warehouseService.reserve(product, dto.quantity());
        StockRequest request = requestRepo.save(StockRequest.builder()
                .branchId(branch.getId())
                .branchName(branch.getName())
                .productId(product.getId())
                .requestedBy(user.getUsername())
                .quantity(dto.quantity())
                .status(RequestStatus.RESERVED)
                .notes(dto.notes())
                .createdAt(Instant.now())
                .build());
        return toDto(request);
    }

    public StockRequestDto cancel(String id) {
        StockRequest request = require(id);
        UserAccount user = currentUser.requireUser();
        if (user.getRole() == Role.BRANCH_USER && !request.getBranchId().equals(requireBranch(user).getId())) {
            throw new ApiException("You can only cancel your branch requests");
        }
        if (request.getStatus() != RequestStatus.RESERVED) {
            throw new ApiException("Only reserved requests can be cancelled");
        }
        warehouseService.release(requireProduct(request.getProductId()), request.getQuantity());
        request.setStatus(RequestStatus.CANCELLED);
        request.setUpdatedAt(Instant.now());
        return toDto(requestRepo.save(request));
    }

    public StockRequestDto reject(String id) {
        requireAdmin();
        StockRequest request = require(id);
        if (request.getStatus() != RequestStatus.RESERVED) {
            throw new ApiException("Only reserved requests can be rejected");
        }
        warehouseService.release(requireProduct(request.getProductId()), request.getQuantity());
        request.setStatus(RequestStatus.REJECTED);
        request.setUpdatedAt(Instant.now());
        return toDto(requestRepo.save(request));
    }

    public StockRequestDto fulfill(String id) {
        requireAdmin();
        StockRequest request = require(id);
        if (request.getStatus() != RequestStatus.RESERVED) {
            throw new ApiException("Only reserved requests can be fulfilled");
        }
        warehouseService.ship(requireProduct(request.getProductId()), request.getQuantity());
        BranchHolding holding = holdingRepo.findByBranchIdAndProductId(request.getBranchId(), request.getProductId())
                .orElseGet(() -> holdingRepo.save(BranchHolding.builder()
                        .branchId(request.getBranchId())
                        .branchName(request.getBranchName())
                        .productId(request.getProductId())
                        .quantity(0)
                        .build()));
        holding.setQuantity(holding.getQuantity() + request.getQuantity());
        holdingRepo.save(holding);
        request.setStatus(RequestStatus.FULFILLED);
        request.setUpdatedAt(Instant.now());
        return toDto(requestRepo.save(request));
    }

    public List<HoldingDto> holdings() {
        UserAccount user = currentUser.requireUser();
        List<BranchHolding> rows = user.getRole() == Role.ADMIN
                ? holdingRepo.findAll()
                : holdingRepo.findByBranchId(requireBranch(user).getId());
        return rows.stream().map(this::toHolding).toList();
    }

    private Product requireProduct(String productId) {
        return productRepo.findById(productId).orElseThrow(() -> new ApiException("Product not found"));
    }

    private void requireAdmin() {
        if (!currentUser.isAdmin()) {
            throw new ApiException("Admin only");
        }
    }

    private Branch requireBranch(UserAccount user) {
        if (user.getBranchId() == null || user.getBranchId().isBlank()) {
            throw new ApiException("User is not assigned to a branch");
        }
        Branch branch = new Branch();
        branch.setId(user.getBranchId());
        branch.setName(user.getBranchName());
        return branch;
    }

    private StockRequest require(String id) {
        return requestRepo.findById(id).orElseThrow(() -> new ApiException("Request not found"));
    }

    private StockRequestDto toDto(StockRequest r) {
        Product p = productRepo.findById(r.getProductId()).orElse(null);
        String requestedByName = r.getRequestedBy();
        UserAccount u = userRepo.findByUsername(r.getRequestedBy()).orElse(null);
        if (u != null && u.getDisplayName() != null) {
            requestedByName = u.getDisplayName();
        }
        return new StockRequestDto(
                r.getId(),
                r.getBranchId(),
                r.getBranchName(),
                r.getProductId(),
                p != null ? p.getSku() : r.getProductId(),
                p != null ? p.getName() : r.getProductId(),
                requestedByName,
                r.getQuantity(),
                r.getStatus(),
                r.getNotes(),
                r.getCreatedAt()
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
}