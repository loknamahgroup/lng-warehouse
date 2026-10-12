package com.branchstock.repo;

import com.branchstock.domain.RequestStatus;
import com.branchstock.domain.StockRequest;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface StockRequestRepository extends MongoRepository<StockRequest, String> {
    List<StockRequest> findByBranchIdOrderByCreatedAtDesc(String branchId);
    List<StockRequest> findAllByOrderByCreatedAtDesc();
    long countByStatus(RequestStatus status);
}
