package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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

    private String requestedBy;

    private String notes;

    private RequestStatus status;

    @Builder.Default
    private List<StockRequestLine> lines = new ArrayList<>();

    private int totalQuantity;

    private Instant createdAt;

    private Instant updatedAt;
}
