package com.branchstock.web;

import com.branchstock.dto.ProductDto;
import com.branchstock.service.ProductService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<ProductDto> list() {
        return productService.list();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ProductDto create(@RequestBody ProductDto dto) {
        return productService.create(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductDto update(@PathVariable String id, @RequestBody ProductDto dto) {
        return productService.update(id, dto);
    }
}
