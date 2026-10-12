package com.branchstock.repo;

import com.branchstock.domain.Branch;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface BranchRepository extends MongoRepository<Branch, String> {
    Optional<Branch> findByCode(String code);
    boolean existsByCode(String code);
}
