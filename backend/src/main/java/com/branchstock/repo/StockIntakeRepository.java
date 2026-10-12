package com.branchstock.repo;

import com.branchstock.domain.StockIntake;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface StockIntakeRepository extends MongoRepository<StockIntake, String> {

    List<StockIntake> findAllByOrderByCreatedAtDesc();

    boolean existsByIntakeNo(String intakeNo);

    long countByIntakeNoStartingWith(String prefix);
}
