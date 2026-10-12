package com.branchstock.repo;

import com.branchstock.domain.Product;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ProductRepository extends MongoRepository<Product, String> {
    Optional<Product> findBySku(String sku);
    boolean existsBySku(String sku);
}
