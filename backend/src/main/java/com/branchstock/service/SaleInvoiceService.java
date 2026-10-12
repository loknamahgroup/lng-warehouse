package com.branchstock.service;

import com.branchstock.domain.Branch;
import com.branchstock.domain.BranchHolding;
import com.branchstock.domain.Product;
import com.branchstock.domain.Role;
import com.branchstock.domain.SaleInvoice;
import com.branchstock.domain.SaleLineItem;
import com.branchstock.domain.UserAccount;
import com.branchstock.dto.CreateSaleRequest;
import com.branchstock.dto.CreateSoldItemRequest;
import com.branchstock.dto.SaleInvoiceDto;
import com.branchstock.dto.SaleLineItemDto;
import com.branchstock.repo.BranchHoldingRepository;
import com.branchstock.repo.ProductRepository;
import com.branchstock.repo.SaleInvoiceRepository;
import com.branchstock.web.ApiException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SaleInvoiceService {

    private final SaleInvoiceRepository invoiceRepo;
    private final ProductRepository productRepo;
    private final BranchHoldingRepository holdingRepo;
    private final CurrentUserService currentUser;

    public SaleInvoiceService(
            SaleInvoiceRepository invoiceRepo,
            ProductRepository productRepo,
            BranchHoldingRepository holdingRepo,
            CurrentUserService currentUser
    ) {
        this.invoiceRepo = invoiceRepo;
        this.productRepo = productRepo;
        this.holdingRepo = holdingRepo;
        this.currentUser = currentUser;
    }

    public List<SaleInvoiceDto> list() {
        UserAccount user = currentUser.requireUser();
        List<SaleInvoice> rows = user.getRole() == Role.ADMIN
                ? invoiceRepo.findAll(Sort.by(Sort.Direction.DESC, "soldAt"))
                : invoiceRepo.findByBranchIdOrderBySoldAtDesc(requireBranch(user).getId());
        return rows.stream().map(this::toDto).toList();
    }

    public SaleInvoiceDto get(String id) {
        SaleInvoice invoice = invoiceRepo.findById(id).orElseThrow(() -> new ApiException("Invoice not found"));
        UserAccount user = currentUser.requireUser();
        if (user.getRole() == Role.BRANCH_USER && !user.getBranchId().equals(invoice.getBranchId())) {
            throw new ApiException("Access denied");
        }
        return toDto(invoice);
    }

    public SaleInvoiceDto createInvoice(CreateSaleRequest request) {
        List<CreateSoldItemRequest> lines = request.items();
        if (lines == null || lines.isEmpty()) {
            throw new ApiException("No sale items provided");
        }
        UserAccount user = currentUser.requireUser();
        Branch branch = requireBranch(user);

        // 1. Validate ALL lines against branch holdings — nothing saved if any line fails
        Map<String, Product> products = new HashMap<>();
        Map<String, BranchHolding> holdings = new HashMap<>();
        Map<String, Integer> requested = new HashMap<>();

        for (CreateSoldItemRequest line : lines) {
            if (line.quantity() <= 0) {
                throw new ApiException("Quantity must be greater than zero");
            }
            if (line.price() < 0) {
                throw new ApiException("Price cannot be negative");
            }
            Product product = products.computeIfAbsent(line.productId(), id ->
                    productRepo.findById(id).orElseThrow(() -> new ApiException("Product not found")));
            if (!product.isActive()) {
                throw new ApiException("Product is inactive: " + product.getName());
            }
            requested.merge(product.getId(), line.quantity(), Integer::sum);
            holdings.computeIfAbsent(product.getId(), id ->
                    holdingRepo.findByBranchIdAndProductId(branch.getId(), id)
                            .orElse(BranchHolding.builder()
                                    .branchId(branch.getId())
                                    .branchName(branch.getName())
                                    .productId(id)
                                    .quantity(0)
                                    .build()));
        }

        for (Map.Entry<String, Integer> e : requested.entrySet()) {
            Product product = products.get(e.getKey());
            BranchHolding holding = holdings.get(e.getKey());
            if (holding.getQuantity() < e.getValue()) {
                throw new ApiException(String.format(
                        "Out of stock for %s (%s). Available: %d, Requested: %d",
                        product.getName(), product.getSku(), holding.getQuantity(), e.getValue()));
            }
        }
        // 2. Everything valid — build the invoice with all product lines
        List<SaleLineItem> items = new ArrayList<>();
        double total = 0;
        for (CreateSoldItemRequest line : lines) {
            Product product = products.get(line.productId());
            double amount = line.quantity() * line.price();
            total += amount;
            items.add(SaleLineItem.builder()
                    .productId(product.getId())
                    .sku(product.getSku())
                    .productName(product.getName())
                    .quantity(line.quantity())
                    .price(line.price())
                    .amount(amount)
                    .build());
        }

        SaleInvoice invoice = invoiceRepo.save(SaleInvoice.builder()
                .invoiceNo(generateInvoiceNo())
                .branchId(branch.getId())
                .branchName(branch.getName())
                .userId(user.getId())
                .username(user.getUsername())
                .soldBy(user.getDisplayName())
                .customerName(request.customerName())
                .customerPhone(request.customerPhone())
                .customerEmail(request.customerEmail())
                .customerAddress(request.customerAddress())
                .soldAt(Instant.now())
                .items(items)
                .total(total)
                .build());

        // 3. Reduce branch holdings
        for (Map.Entry<String, Integer> e : requested.entrySet()) {
            BranchHolding holding = holdings.get(e.getKey());
            holding.setQuantity(holding.getQuantity() - e.getValue());
        }
        holdingRepo.saveAll(holdings.values());

        return toDto(invoice);
    }

    private String generateInvoiceNo() {
        String datePart = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneId.of("UTC"))
                .format(Instant.now());
        long seq = 1;
        String candidate;
        do {
            candidate = String.format("INV-%s-%04d", datePart, seq);
            seq++;
        } while (invoiceRepo.existsByInvoiceNo(candidate));
        return candidate;
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

    private SaleInvoiceDto toDto(SaleInvoice i) {
        List<SaleLineItemDto> items = i.getItems() == null ? List.of() : i.getItems().stream()
                .map(it -> new SaleLineItemDto(
                        it.getProductId(),
                        it.getSku(),
                        it.getProductName(),
                        it.getQuantity(),
                        it.getPrice(),
                        it.getAmount()
                ))
                .toList();
        return new SaleInvoiceDto(
                i.getId(),
                i.getInvoiceNo(),
                i.getBranchId(),
                i.getBranchName(),
                i.getUserId(),
                i.getUsername(),
                i.getSoldBy(),
                i.getCustomerName(),
                i.getCustomerPhone(),
                i.getCustomerEmail(),
                i.getCustomerAddress(),
                i.getSoldAt(),
                items,
                i.getTotal()
        );
    }
}