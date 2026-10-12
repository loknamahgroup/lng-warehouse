package com.branchstock.repo;

import com.branchstock.domain.WarehouseStock;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface WarehouseStockRepository extends MongoRepository<WarehouseStock, String> {
    Optional<WarehouseStock> findByProductId(String productId);
}
