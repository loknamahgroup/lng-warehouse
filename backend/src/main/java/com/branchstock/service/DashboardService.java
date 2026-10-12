package com.branchstock.service;

import com.branchstock.domain.RequestStatus;
import com.branchstock.domain.Role;
import com.branchstock.domain.UserAccount;
import com.branchstock.dto.DashboardDto;
import com.branchstock.dto.WarehouseStockDto;
import com.branchstock.repo.BranchHoldingRepository;
import com.branchstock.repo.BranchRepository;
import com.branchstock.repo.ProductRepository;
import com.branchstock.repo.StockRequestRepository;
import com.branchstock.repo.WarehouseStockRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final ProductRepository productRepo;
    private final BranchRepository branchRepo;
    private final WarehouseStockRepository stockRepo;
    private final StockRequestRepository requestRepo;
    private final BranchHoldingRepository holdingRepo;
    private final ProductService productService;
    private final CurrentUserService currentUser;

    public DashboardService(
            ProductRepository productRepo,
            BranchRepository branchRepo,
            WarehouseStockRepository stockRepo,
            StockRequestRepository requestRepo,
            BranchHoldingRepository holdingRepo,
            ProductService productService,
            CurrentUserService currentUser
    ) {
        this.productRepo = productRepo;
        this.branchRepo = branchRepo;
        this.stockRepo = stockRepo;
        this.requestRepo = requestRepo;
        this.holdingRepo = holdingRepo;
        this.productService = productService;
        this.currentUser = currentUser;
    }

    public DashboardDto load() {
        UserAccount user = currentUser.requireUser();
        var stocks = stockRepo.findAll().stream()
                .map(productService::toStockDto)
                .filter(java.util.Objects::nonNull)
                .toList();
        int onHand = stocks.stream().mapToInt(WarehouseStockDto::onHand).sum();
        int reserved = stocks.stream().mapToInt(WarehouseStockDto::reserved).sum();
        int available = stocks.stream().mapToInt(WarehouseStockDto::available).sum();
        List<WarehouseStockDto> low = stocks.stream().filter(WarehouseStockDto::lowStock).toList();

        List<com.branchstock.domain.BranchHolding> holdings = user.getRole() == Role.ADMIN
                ? holdingRepo.findAll()
                : user.getBranchId() != null ? holdingRepo.findByBranchId(user.getBranchId()) : List.of();

        int holdingQty = holdings.stream().mapToInt(h -> h.getQuantity()).sum();
        List<DashboardDto.HoldingSummary> summaries = holdings.stream()
                .collect(Collectors.groupingBy(h -> h.getBranchId()))
                .values().stream()
                .map(list -> new DashboardDto.HoldingSummary(
                        list.get(0).getBranchId(),
                        list.get(0).getBranchName(),
                        list.stream().mapToInt(h -> h.getQuantity()).sum(),
                        list.size()
                ))
                .toList();

        return new DashboardDto(
                productRepo.count(),
                branchRepo.count(),
                onHand,
                reserved,
                available,
                requestRepo.countByStatus(RequestStatus.RESERVED),
                holdingQty,
                low,
                summaries
        );
    }
}