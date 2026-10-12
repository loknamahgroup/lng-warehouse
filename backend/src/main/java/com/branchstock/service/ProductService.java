package com.branchstock.service;

import com.branchstock.domain.Product;
import com.branchstock.domain.WarehouseStock;
import com.branchstock.dto.ProductDto;
import com.branchstock.dto.WarehouseStockDto;
import com.branchstock.repo.ProductRepository;
import com.branchstock.repo.WarehouseStockRepository;
import com.branchstock.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepo;
    private final WarehouseStockRepository stockRepo;

    public ProductService(ProductRepository productRepo, WarehouseStockRepository stockRepo) {
        this.productRepo = productRepo;
        this.stockRepo = stockRepo;
    }

    public List<ProductDto> list() {
        return productRepo.findAll().stream().map(this::toDto).toList();
    }

    public ProductDto create(ProductDto dto) {
        if (productRepo.existsBySku(dto.sku().trim())) {
            throw new ApiException("SKU already exists");
        }
        Product product = Product.builder()
                .sku(dto.sku().trim())
                .name(dto.name().trim())
                .category(dto.category())
                .unit(dto.unit() == null || dto.unit().isBlank() ? "unit" : dto.unit())
                .description(dto.description())
                .reorderLevel(dto.reorderLevel() > 0 ? dto.reorderLevel() : 10)
                .active(true)
                .build();
        product = productRepo.save(product);
        stockRepo.save(WarehouseStock.builder().productId(product.getId()).onHand(0).reserved(0).build());
        return toDto(product);
    }

    public ProductDto update(String id, ProductDto dto) {
        Product product = productRepo.findById(id).orElseThrow(() -> new ApiException("Product not found"));
        productRepo.findBySku(dto.sku().trim()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new ApiException("SKU already exists");
            }
        });
        product.setSku(dto.sku().trim());
        product.setName(dto.name().trim());
        product.setCategory(dto.category());
        product.setUnit(dto.unit());
        product.setDescription(dto.description());
        product.setReorderLevel(dto.reorderLevel());
        product.setActive(dto.active());
        return toDto(productRepo.save(product));
    }

    public ProductDto toDto(Product p) {
        return new ProductDto(p.getId(), p.getSku(), p.getName(), p.getCategory(), p.getUnit(), p.getDescription(), p.getReorderLevel(), p.isActive());
    }

    public WarehouseStockDto toStockDto(WarehouseStock s) {
        Product p = productRepo.findById(s.getProductId()).orElse(null);
        if (p == null) {
            return null;
        }
        int available = s.getAvailable();
        return new WarehouseStockDto(
                p.getId(), p.getSku(), p.getName(), p.getCategory(), p.getUnit(),
                s.getOnHand(), s.getReserved(), available, p.getReorderLevel(), available <= p.getReorderLevel()
        );
    }
}
