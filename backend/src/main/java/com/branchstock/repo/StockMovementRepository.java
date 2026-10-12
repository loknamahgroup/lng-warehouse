package com.branchstock.repo;

import com.branchstock.domain.StockMovement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface StockMovementRepository extends MongoRepository<StockMovement, String> {
    List<StockMovement> findAllByOrderByCreatedAtDesc();
}
