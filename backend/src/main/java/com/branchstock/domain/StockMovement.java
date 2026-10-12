package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "stock_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovement {

    @Id
    private String id;

    private String productId;

    private String branchId;

    private MovementType type;

    private int quantity;

    private String note;

    private Instant createdAt;
}
