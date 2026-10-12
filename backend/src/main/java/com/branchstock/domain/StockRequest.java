package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "stock_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockRequest {

    @Id
    private String id;

    private String branchId;

    private String branchName;

    private String productId;

    private String requestedBy;

    private int quantity;

    private RequestStatus status;

    private String notes;

    private Instant createdAt;

    private Instant updatedAt;
}
