package com.branchstock.repo;

import com.branchstock.domain.BranchHolding;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface BranchHoldingRepository extends MongoRepository<BranchHolding, String> {
    Optional<BranchHolding> findByBranchIdAndProductId(String branchId, String productId);
    List<BranchHolding> findByBranchId(String branchId);
}
