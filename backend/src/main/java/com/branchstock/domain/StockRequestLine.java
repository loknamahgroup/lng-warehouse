package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "stock_request_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockRequestLine {

    @Id
    private String id;

    private String requestId;

    private String productId;

    private String productName;

    private String sku;

    private String unit;

    private int quantity;

    private int requestedQuantity;

    private int approvedQuantity;

    private String notes;

    private String requestedBy;

    private boolean approved;

    private boolean rejected;

    private Instant createdAt;

    private Instant updatedAt;
}