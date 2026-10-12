package com.branchstock.repo;

import com.branchstock.domain.SaleInvoice;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SaleInvoiceRepository extends MongoRepository<SaleInvoice, String> {

    List<SaleInvoice> findByBranchIdOrderBySoldAtDesc(String branchId);

    boolean existsByInvoiceNo(String invoiceNo);
}