package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "sale_invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaleInvoice {

    @Id
    private String id;

    @Indexed(unique = true)
    private String invoiceNo;

    private String branchId;
    private String branchName;

    private String userId;
    private String username;
    private String soldBy;

    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String customerAddress;

    private Instant soldAt;

    @Builder.Default
    private List<SaleLineItem> items = new ArrayList<>();

    private double total;
}